import OpenAI from "openai";
require("dotenv").config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function callGPTForCommits(prompt: string, content: string) {
  const completion = await openai.chat.completions.create({
    messages: [
      { role: "system", content: prompt },
      { role: "user", content: content },
    ],
    model: "gpt-3.5-turbo",
  });

  return completion.choices[0].message.content;
}

export async function callGPTForReadme(prompt: string, content: string) {
  const completion = await openai.chat.completions.create({
    messages: [
      { role: "system", content: prompt },
      { role: "user", content: content },
    ],
    model: "gpt-3.5-turbo",
  });

  return completion.choices[0].message.content;
}

export async function callGPTForEmoji(prompt: string, content: string) {
  const completion = await openai.chat.completions.create({
    messages: [
      { role: "system", content: prompt },
      { role: "user", content: content },
    ],
    model: "gpt-3.5-turbo",
  });

  const answer = completion.choices[0].message.content;

  return answer && answer.length <= 2
    ? completion.choices[0].message.content
    : "⭐";
}
