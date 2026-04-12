import { Octokit } from "octokit";
import fs from "fs";
import { callLLMForCommits, callLLMForEmoji, callLLMForReadme } from "./llm";
import {
  generateDropdown,
  generateDropdowns,
  generateMarkdown,
  type ProfileIdentity,
} from "./markdown";
import {
  getRepoSummaryContent,
  hasFetchedReadme,
  NO_README_FOUND,
  normalizeReadmeSummary,
  README_SUMMARY_UNAVAILABLE,
  type RepoSummaryContent,
} from "./repo-content";
import {
  getPaginatedCommitMessages,
  rankRepoActivities,
  shortlistRepos,
  type RepoActivity,
} from "./repo-activity";
import { getErrorMessage, isRetryableExternalError, withRetry } from "./retry";

require("dotenv").config();

// GPT prompts
const commit_summary_prompt = `
You will be provided with a list of git commits. 
Using this, generate a summary paragraph of about 10 to 30 words long. 
Concentrate solely on the Git commits provided. Do not include additional information such as the project description or speculative insights. 
Do not include actions labeled 'add files via upload', as these do not offer specific insights. 
Base your summaries on the information provided in the uploaded documents. 
Refer to this information as your knowledge source. Avoid speculations or incorporating information not contained in the documents. Heavily favor knowledge provided in the documents before using baseline knowledge. Maintain a professional tone in your summaries. Ensure that your summaries are helpful, accessible, and factual, catering to both technical and non-technical audiences. 
Do not share the names of the files directly with end users. Under no circumstances provide a download link to any of the files.`;

const repo_summary_prompt = `
You summarize GitHub repository READMEs.

Output contract:
- Return exactly one line of plain text.
- If the provided content does not contain substantive README markdown, return exactly: No README found.
- Otherwise return exactly one sentence between 20 and 50 words.
- That sentence must start with: This repository contains

Rules:
- Use only facts grounded in the provided README markdown.
- Do not ask the user for files, links, or more context.
- Do not mention missing context, the prompt, or the repository description.
- Do not invent features, technologies, or purpose that are not stated in the README.
- Do not use markdown, bullets, labels, or quotation marks.
`;

const emoji_generation_prompt = `
Based on the context of a sentence/ phrase, generate for an emoji that best conveys and represents the main topic of that sentence/ phrase. The emoji produced should only be from those found in the iphone operating systems keyboard. 
If you are unsure of the main topic of that sentence/ phrase, default to either one of this list of 9 emojis: [laptop, computer, desktop computer, keyboard, Rocket, Globe with Meridians, File Folder, Star , Gear]
I want the output to only be one emoji and nothing else`;

const octokit = new Octokit({ auth: process.env.GH_TOKEN });

function getOptionalEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}
function logStageError(stage: string, target: string, error: unknown) {
  console.error(`[${stage}] ${target}: ${getErrorMessage(error)}`, error);
}

async function getRepos() {
  if (!process.env.GH_USER) throw new Error("GH_USER not set");
  const username = process.env.GH_USER;
  const repos = await withRetry(
    `GitHub repo list for ${username}`,
    () =>
      octokit.rest.repos.listForUser({
        username: username,
        sort: "pushed",
        direction: "desc",
        per_page: 100,
      }),
    { shouldRetry: isRetryableExternalError }
  );
  return repos.data;
}

async function getCommits(repo: string, start: string, end: string) {
  if (!process.env.GH_USER) throw new Error("GH_USER not set");
  const username = process.env.GH_USER;

  return getPaginatedCommitMessages((page, perPage) =>
    withRetry(
      `GitHub commits for ${repo} page ${page}`,
      async () => {
        const commits = await octokit.rest.repos.listCommits({
          owner: username,
          repo: repo,
          since: start,
          until: end,
          page,
          per_page: perPage,
        });

        return commits.data;
      },
      { shouldRetry: isRetryableExternalError }
    )
  );
}

async function getProfileIdentity(): Promise<ProfileIdentity> {
  if (!process.env.GH_USER) throw new Error("GH_USER not set");

  const username = process.env.GH_USER.trim();
  const configuredDisplayName = getOptionalEnv("GH_DISPLAY_NAME");
  const configuredBio = getOptionalEnv("GH_BIO");

  if (configuredDisplayName && configuredBio) {
    return {
      username,
      displayName: configuredDisplayName,
      bio: configuredBio,
    };
  }

  try {
    const profile = await withRetry(
      `GitHub profile for ${username}`,
      () =>
        octokit.rest.users.getByUsername({
          username,
        }),
      { shouldRetry: isRetryableExternalError }
    );

    return {
      username,
      displayName: configuredDisplayName ?? profile.data.name?.trim() ?? username,
      bio: configuredBio ?? profile.data.bio?.trim() ?? "",
    };
  } catch (error) {
    logStageError("profile-identity", username, error);

    return {
      username,
      displayName: configuredDisplayName ?? username,
      bio: configuredBio ?? "",
    };
  }
}

function entryIntoString(repo: RepoActivity) {
  return `Repository name: ${repo.name}
Repository description: ${repo.description}
    
Commits:\n${repo.commitMessages.join("\n")}\n`;
}

function fallbackCommitSummary(commitMessages: string[]) {
  const commitCount = commitMessages.length;
  const suffix = commitCount === 1 ? "" : "s";
  return `Recent work recorded across ${commitCount} commit${suffix} in the last 90 days.`;
}

function getLocalRepoSummaryContent(repo: RepoActivity): RepoSummaryContent | null {
  const profileRepoName = process.env.GH_USER?.trim();

  if (!profileRepoName || repo.name !== profileRepoName) {
    return null;
  }

  const backupReadmePath = "README_BACKUP.md";
  if (!fs.existsSync(backupReadmePath)) {
    return null;
  }

  const backupReadme = fs.readFileSync(backupReadmePath, "utf8").trim();
  if (!backupReadme) {
    return null;
  }

  return {
    content: backupReadme,
    source: "readme",
  };
}

async function buildRepoDropdown(repo: RepoActivity) {
  let commitsSummary = fallbackCommitSummary(repo.commitMessages);
  let emoji = "⭐";
  let readmeSummary = NO_README_FOUND;

  try {
    const summary = await callLLMForCommits(
      commit_summary_prompt,
      entryIntoString(repo)
    );
    if (summary) {
      commitsSummary = summary;
    }
  } catch (error) {
    logStageError("commit-summary", repo.name, error);
  }

  try {
    const generatedEmoji = await callLLMForEmoji(
      emoji_generation_prompt,
      repo.name
    );
    if (generatedEmoji) {
      emoji = generatedEmoji;
    }
  } catch (error) {
    logStageError("emoji-generation", repo.name, error);
  }

  try {
    const repoSummaryContent =
      getLocalRepoSummaryContent(repo) ??
      (await getRepoSummaryContent(
        () =>
          withRetry(
            `GitHub README for ${repo.name}`,
            () =>
              octokit.rest.repos.getReadme({
                owner: process.env.GH_USER as string,
                repo: repo.name,
              }),
            { shouldRetry: isRetryableExternalError }
          ),
        repo.description
      ));

    if (hasFetchedReadme(repoSummaryContent)) {
      readmeSummary = README_SUMMARY_UNAVAILABLE;

      const generatedReadmeSummary = await callLLMForReadme(
        repo_summary_prompt,
        repoSummaryContent.content
      );
      const normalizedReadmeSummary =
        normalizeReadmeSummary(generatedReadmeSummary);

      if (normalizedReadmeSummary) {
        readmeSummary = normalizedReadmeSummary;
      }
    }
  } catch (error) {
    logStageError("readme-summary", repo.name, error);
  }

  return (
    generateDropdown(
      `${emoji}${repo.name}`,
      readmeSummary,
      commitsSummary,
      repo.url
    ) ?? "No recent commits in this repository."
  );
}

async function main(): Promise<void> {
  const currTime = new Date();
  const prevTime = new Date(currTime.getTime() - 90 * 24 * 60 * 60 * 1000); // 90 days ago

  const profileIdentity = await getProfileIdentity();
  const repos = await getRepos();
  const entries: RepoActivity[] = [];

  // Repositories are already returned sorted by `pushed`. We keep that as the
  // recency signal, inspect only a bounded shortlist, then rank by full
  // 90-day commit volume so busy repos are not penalized by pagination.
  for (const repo of shortlistRepos(repos)) {
    try {
      const commitMessages = await getCommits(
        repo.name,
        prevTime.toISOString(),
        currTime.toISOString()
      );

      if (commitMessages.length > 0) {
        entries.push({
          name: repo.name,
          description: repo.description ?? "",
          url: repo.html_url,
          commitMessages,
          lastPushedAt: repo.pushed_at ?? null,
        });
      }
    } catch (error) {
      logStageError("repo-commits", repo.name, error);
    }
  }

  const sortedEntries = rankRepoActivities(entries);

  const replies: { [name: string]: string } = {};
  for (const repo of sortedEntries) {
    try {
      replies[repo.name] = await buildRepoDropdown(repo);
    } catch (error) {
      logStageError("repo-render", repo.name, error);
    }
  }

  if (Object.keys(replies).length === 0) {
    console.warn(
      "[workflow] No repository summaries were generated. Writing README with an empty activity section."
    );
  }

  fs.writeFileSync(
    "README.md",
    generateMarkdown(profileIdentity, generateDropdowns(replies))
  );
}

main().catch((error) => {
  logStageError("workflow", "main", error);
  process.exitCode = 1;
});
