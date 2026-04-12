import { Octokit } from "octokit";
import fs from "fs";
import { callGPTForCommits, callGPTForEmoji, callGPTForReadme } from "./openai";
import {
  generateDropdown,
  generateDropdowns,
  generateMarkdown,
} from "./markdown";
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
You will be provided with a readme file of a github repository formatted in markdown, You are tasked with generating a summary of what the repository is about. 
A professional tone should be used for the summary, and it should be between 20 to 50 words.
Remember to start of the summary with "This repository contains..`;

const emoji_generation_prompt = `
Based on the context of a sentence/ phrase, generate for an emoji that best conveys and represents the main topic of that sentence/ phrase. The emoji produced should only be from those found in the iphone operating systems keyboard. 
If you are unsure of the main topic of that sentence/ phrase, default to either one of this list of 9 emojis: [laptop, computer, desktop computer, keyboard, Rocket, Globe with Meridians, File Folder, Star , Gear]
I want the output to only be one emoji and nothing else`;

const octokit = new Octokit({ auth: process.env.GH_TOKEN });

type RepoActivity = {
  name: string;
  description: string;
  url: string;
  commitMessages: string[];
};

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
  const commits = await withRetry(
    `GitHub commits for ${repo}`,
    () =>
      octokit.rest.repos.listCommits({
        owner: username,
        repo: repo,
        since: start,
        until: end,
      }),
    { shouldRetry: isRetryableExternalError }
  );
  return commits.data;
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

function fallbackReadmeSummary(description: string) {
  return description.trim() || "Repository summary unavailable.";
}

async function buildRepoDropdown(repo: RepoActivity) {
  let commitsSummary = fallbackCommitSummary(repo.commitMessages);
  let emoji = "⭐";
  let readmeSummary = fallbackReadmeSummary(repo.description);

  try {
    const summary = await callGPTForCommits(
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
    const generatedEmoji = await callGPTForEmoji(emoji_generation_prompt, repo.name);
    if (generatedEmoji) {
      emoji = generatedEmoji;
    }
  } catch (error) {
    logStageError("emoji-generation", repo.name, error);
  }

  try {
    const generatedReadmeSummary = await callGPTForReadme(
      repo_summary_prompt,
      repo.description
    );
    if (generatedReadmeSummary) {
      readmeSummary = generatedReadmeSummary;
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

  const repos = await getRepos();
  const entries: RepoActivity[] = [];

  for (const repo of repos) {
    try {
      const commits = await getCommits(
        repo.name,
        prevTime.toISOString(),
        currTime.toISOString()
      );

      if (commits.length > 0) {
        const messages = commits.map((commit) => commit.commit.message);
        entries.push({
          name: repo.name,
          description: repo.description ?? "",
          url: repo.html_url,
          commitMessages: messages,
        });
      }
    } catch (error) {
      logStageError("repo-commits", repo.name, error);
    }
  }

  const sortedEntries = entries
    .filter((entry) => entry.commitMessages.length > 0)
    .sort((a, b) => b.commitMessages.length - a.commitMessages.length)
    .slice(0, 5);

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

  fs.writeFileSync("README.md", generateMarkdown(generateDropdowns(replies)));
}

main().catch((error) => {
  logStageError("workflow", "main", error);
  process.exitCode = 1;
});
