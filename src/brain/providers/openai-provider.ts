/**
 * Brain: OpenAI LLM Provider
 *
 * Implementation of LLMProvider for OpenAI (chat completions API).
 * Uses GenericOpenAIProvider under the hood.
 */

import type { LLMProvider, ProviderConfig } from "./provider";
import { GenericOpenAIProvider, buildGenericOpenAIConfig } from "./generic-openai-provider";

/**
 * OpenAI provider implementation.
 */
export class OpenAIProvider implements LLMProvider {
  readonly name = "openai";
  private genericProvider: GenericOpenAIProvider;

  constructor(apiKey: string, baseUrl = "https://api.openai.com/v1") {
    this.genericProvider = new GenericOpenAIProvider({
      name: "openai",
      apiKey,
      baseUrl,
      supportsStrictSchema: true,
    });
  }

  async generate(prompt: string, config: ProviderConfig): Promise<string> {
    return this.genericProvider.generate(prompt, config);
  }
}

/**
 * Build OpenAI-compatible config.
 */
export function buildOpenAIConfig(
  model: string,
  systemInstruction: string,
  maxOutputTokens: number,
  options?: { disableSchema?: boolean }
): ProviderConfig {
  return buildGenericOpenAIConfig(model, systemInstruction, maxOutputTokens, options);
}
