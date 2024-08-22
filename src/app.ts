import { Octokit } from "octokit";
import fs from "fs";
import { callGPTForCommits, 
    callGPTForEmoji, 
    callGPTForReadme 
} 
    from "./openai";
import {
  generateDropdown,
  generateDropdowns,
  generateMarkdown,
} from "./markdown";

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

async function getRepos() {
  if (!process.env.GH_USER) throw new Error("GH_USER not set");
  const username = process.env.GH_USER;
  const repos = await octokit.rest.repos.listForUser({
    username: username,
    sort: "pushed",
    direction: "desc",
    per_page: 100, // Fetch more repos if necessary
  });
  return repos.data;
}

async function getCommits(repo: string, start: string, end: string) {
  if (!process.env.GH_USER) throw new Error("GH_USER not set");
  const username = process.env.GH_USER;
  const commits = await octokit.rest.repos.listCommits({
    owner: username,
    repo: repo,
    since: start, // start of the time range
    until: end, // end of the time range
  });
  return commits.data;
}

function entryIntoString(key: string, value: string[]) {
  return `Repository name: ${key.split(",|", 3)[0]}
Repository description: ${key.split(",|", 3)[1]}
    
Commits:\n${value.join("\n")}\n`;
}

async function main(
  commit_summary_prompt: string,
  repo_summary_prompt: string,
  emoji_generation_prompt: string
): Promise<void> {
  const currTime = new Date();
  const prevTime = new Date(currTime.getTime() - 90 * 24 * 60 * 60 * 1000); // 90 days ago

  const repos = await getRepos();
  const entries: { [key: string]: string[] } = {};

  for (const repo of repos) {
    try {
      const commits = await getCommits(
        repo.name,
        prevTime.toISOString(),
        currTime.toISOString()
      );

      if (commits.length > 0) {
        const messages = commits.map((commit) => commit.commit.message);
        const repoString = `${repo.name},|${repo.description ?? ""},|${
          repo.html_url
        }`;
        entries[repoString] = messages;
      }
    } catch (error) {
      console.log(`Error processing repo: ${repo.name}`, error);
    }
  }

  const sortedEntries = Object.entries(entries)
    .filter(([, value]) => value.length > 0)
    .sort(([, a], [, b]) => b.length - a.length)
    .slice(0, 5);

  const replies: { [name: string]: string } = {};

  for (const [key, value] of sortedEntries) {
    const entryString = entryIntoString(key, value);
    const reply =
      (await callGPTForCommits(commit_summary_prompt, entryString)) ??
      "No recent commits in this repository";
    const emoji =
      (await callGPTForEmoji(emoji_generation_prompt, key.split(",|", 3)[0])) ??
      "";
    const readmeSummary =
      (await callGPTForReadme(repo_summary_prompt, key.split(",|", 3)[1])) ??
      "No readme file in this repository.";
    replies[key.split(",|")[0]] =
      generateDropdown(
        emoji + key.split(",|", 3)[0],
        readmeSummary,
        reply,
        key.split(",|", 3)[2]
      ) ?? "No recent commits in this repository.";
  }
  fs.writeFileSync("README.md", generateMarkdown(generateDropdowns(replies)));
}

main(commit_summary_prompt, repo_summary_prompt, emoji_generation_prompt);
