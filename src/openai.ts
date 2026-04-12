import OpenAI from "openai";
import { isRetryableExternalError, withRetry } from "./retry";
require("dotenv").config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function createCompletion(prompt: string, content: string) {
  return withRetry(
    "OpenAI chat completion",
    () =>
      openai.chat.completions.create({
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: content },
        ],
        model: "gpt-3.5-turbo",
      }),
    { shouldRetry: isRetryableExternalError }
  );
}

export async function callGPTForCommits(prompt: string, content: string) {
  const completion = await createCompletion(prompt, content);

  return completion.choices[0].message.content;
}

export async function callGPTForReadme(prompt: string, content: string) {
  const completion = await createCompletion(prompt, content);

  return completion.choices[0].message.content;
}

export async function callGPTForEmoji(prompt: string, content: string) {
  const completion = await createCompletion(prompt, content);

  const answer = completion.choices[0].message.content;

  return answer && answer.length <= 2
    ? completion.choices[0].message.content
    : "⭐";
}
