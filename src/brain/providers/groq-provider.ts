/**
 * Brain: Groq LLM Provider
 *
 * Implementation of LLMProvider for Groq (via OpenAI-compatible API).
 * Uses GenericOpenAIProvider under the hood, but without strict schema support.
 */

import type { LLMProvider, ProviderConfig } from "./provider";
import { GenericOpenAIProvider, buildGenericOpenAIConfig } from "./generic-openai-provider";

/**
 * Groq provider implementation.
 * Uses OpenAI-compatible chat completions endpoint but does not support json_schema strict mode.
 */
export class GroqProvider implements LLMProvider {
  readonly name = "groq";
  private genericProvider: GenericOpenAIProvider;

  constructor(apiKey: string, baseUrl = "https://api.groq.com/openai/v1") {
    this.genericProvider = new GenericOpenAIProvider({
      name: "groq",
      apiKey,
      baseUrl,
      supportsStrictSchema: false,
    });
  }

  async generate(prompt: string, config: ProviderConfig): Promise<string> {
    return this.genericProvider.generate(prompt, config);
  }
}

/**
 * Build Groq-specific config.
 * Groq doesn't use the JSON schema definition in the request itself,
 * it relies on system prompt instructions and type: "json_object".
 */
export function buildGroqConfig(
  model: string,
  systemInstruction: string,
  maxOutputTokens: number,
  options?: { disableSchema?: boolean }
): ProviderConfig {
  return buildGenericOpenAIConfig(model, systemInstruction, maxOutputTokens, options);
}
