import Groq from "groq-sdk";
import { isRetryableExternalError, withRetry } from "./retry";

require("dotenv").config();

type LLMProvider = "groq";

const DEFAULT_LLM_PROVIDER: LLMProvider = "groq";
const DEFAULT_LLM_MODEL = "llama-3.1-8b-instant";

interface LLMClient {
  complete(prompt: string, content: string): Promise<string | null>;
}

class GroqLLMClient implements LLMClient {
  private readonly client: Groq;
  private readonly model: string;

  constructor(apiKey: string, model: string) {
    this.client = new Groq({ apiKey });
    this.model = model;
  }

  async complete(prompt: string, content: string): Promise<string | null> {
    const completion = await withRetry(
      "Groq chat completion",
      () =>
        this.client.chat.completions.create({
          messages: [
            { role: "system", content: prompt },
            { role: "user", content: content },
          ],
          model: this.model,
        }),
      { shouldRetry: isRetryableExternalError }
    );

    return extractMessageText(completion.choices[0]?.message?.content);
  }
}

let cachedClient: LLMClient | undefined;

function extractMessageText(
  content: string | Array<{ type?: string; text?: string }> | null | undefined
): string | null {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    const text = content
      .map((part) => (part.type === "text" ? part.text ?? "" : ""))
      .join("")
      .trim();

    return text.length > 0 ? text : null;
  }

  return null;
}

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
}

function getProvider(): LLMProvider {
  const provider = (
    process.env.LLM_PROVIDER?.trim().toLowerCase() ?? DEFAULT_LLM_PROVIDER
  ) as string;

  if (provider !== "groq") {
    throw new Error(
      `Unsupported LLM_PROVIDER "${provider}". Only "groq" is supported.`
    );
  }

  return provider;
}

function getModel(): string {
  return process.env.LLM_MODEL?.trim() || DEFAULT_LLM_MODEL;
}

function createLLMClient(): LLMClient {
  const provider = getProvider();

  if (provider === "groq") {
    return new GroqLLMClient(getRequiredEnv("GROQ_API_KEY"), getModel());
  }

  throw new Error(`Unsupported LLM provider "${provider}"`);
}

function getLLMClient(): LLMClient {
  if (!cachedClient) {
    cachedClient = createLLMClient();
  }

  return cachedClient;
}

async function callLLM(prompt: string, content: string) {
  return getLLMClient().complete(prompt, content);
}

export async function callLLMForCommits(prompt: string, content: string) {
  return callLLM(prompt, content);
}

export async function callLLMForReadme(prompt: string, content: string) {
  return callLLM(prompt, content);
}

export async function callLLMForEmoji(prompt: string, content: string) {
  const answer = await callLLM(prompt, content);
  const trimmed = answer?.trim();

  return trimmed && trimmed.length <= 2 ? trimmed : "⭐";
}

export { DEFAULT_LLM_MODEL, DEFAULT_LLM_PROVIDER };
