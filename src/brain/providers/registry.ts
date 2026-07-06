/**
 * Brain: LLM Provider Registry
 *
 * Factory for creating LLM providers based on configuration.
 * Handles provider selection, initialization, and retry logic.
 */

import { existsSync } from "fs";
import { resolve } from "path";
import dotenv from "dotenv";
import type { LLMProvider, ProviderConfig } from "./provider";
import { GeminiProvider } from "./gemini-provider";
import { GroqProvider } from "./groq-provider";
import { OpenAIProvider } from "./openai-provider";
import { OpenAICompatProvider } from "./openaicompat-provider";
import { LLM_CONFIG } from "../../shared/config";

// Load .env
const envPath = existsSync(resolve(process.cwd(), ".env"))
  ? resolve(process.cwd(), ".env")
  : resolve(process.cwd(), ".env.example");
dotenv.config({ path: envPath });

/**
 * Supported LLM provider types.
 */
export type ProviderType = "gemini" | "groq" | "openai" | "openaicompat";

/**
 * Validate that required API keys exist for the selected provider.
 */
export function validateProviderEnv(provider: ProviderType): void {
  const keyMap: Record<ProviderType, string> = {
    gemini: "GOOGLE_API_KEY",
    groq: "GROQ_API_KEY",
    openai: "OPENAI_API_KEY",
    openaicompat: "OPENAI_COMPATIBLE_API_KEY",
  };

  const keyName = keyMap[provider];
  const value = process.env[keyName];

  if (!value) {
    throw new Error(
      `Missing required environment variable: ${keyName}.\n` +
        `Copy .env.example to .env and fill in the values.`
    );
  }
}

/**
 * Create an LLM provider instance by type.
 */
export function createProvider(provider?: ProviderType): LLMProvider {
  const type = provider ?? (process.env.LLM_PROVIDER as ProviderType) ?? "gemini";

  validateProviderEnv(type);

  switch (type) {
    case "gemini": {
      const apiKey = process.env.GOOGLE_API_KEY!;
      return new GeminiProvider(apiKey);
    }
    case "groq": {
      const apiKey = process.env.GROQ_API_KEY!;
      return new GroqProvider(apiKey);
    }
    case "openai": {
      const apiKey = process.env.OPENAI_API_KEY!;
      return new OpenAIProvider(apiKey);
    }
    case "openaicompat": {
      const apiKey = process.env.OPENAI_COMPATIBLE_API_KEY!;
      const baseUrl = process.env.OPENAI_COMPATIBLE_BASE_URL;
      if (!baseUrl) {
        throw new Error("OPENAI_COMPATIBLE_BASE_URL is required when using openaicompat provider");
      }
      return new OpenAICompatProvider(apiKey, baseUrl);
    }
    default: {
      throw new Error(
        `Unknown LLM provider: "${type}". Supported: gemini, groq, openai, openaicompat`
      );
    }
  }
}

/**
 * Sleep helper.
 */
async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Call an LLM provider with retry logic.
 */
export async function callProviderWithRetry(
  provider: LLMProvider,
  prompt: string,
  config: ProviderConfig
): Promise<string> {
  let lastError: Error | null = null;
  const startTime = Date.now();
  const promptLength = prompt.length;

  for (let attempt = 1; attempt <= LLM_CONFIG.RETRY_MAX_ATTEMPTS; attempt++) {
    try {
      const attemptStart = Date.now();
      const text = await provider.generate(prompt, config);

      const attemptDuration = Date.now() - attemptStart;
      const totalDuration = Date.now() - startTime;

      console.log(
        `[LLM] ${provider.name} success on attempt ${attempt}/${LLM_CONFIG.RETRY_MAX_ATTEMPTS}. ` +
          `Prompt: ${promptLength} chars, Response: ${text.length} chars. ` +
          `Time: ${attemptDuration}ms (total: ${totalDuration}ms)`
      );

      return text;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < LLM_CONFIG.RETRY_MAX_ATTEMPTS) {
        const delay = LLM_CONFIG.RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
        console.log(
          `[LLM] ${provider.name} attempt ${attempt}/${LLM_CONFIG.RETRY_MAX_ATTEMPTS} failed: ${lastError.message.slice(0, 100)}. ` +
            `Retrying in ${delay}ms...`
        );
        await sleep(delay);
      }
    }
  }

  const totalDuration = Date.now() - startTime;
  console.log(
    `[LLM] ${provider.name} all ${LLM_CONFIG.RETRY_MAX_ATTEMPTS} attempts failed. Total time: ${totalDuration}ms`
  );

  throw lastError ?? new Error("LLM call failed after retries.");
}

/**
 * Validate all required environment variables at startup.
 * Throws immediately if anything is missing, with a clear message.
 */
export function validateEnv(): void {
  const provider = (process.env.LLM_PROVIDER as ProviderType) ?? "gemini";
  validateProviderEnv(provider);
}
