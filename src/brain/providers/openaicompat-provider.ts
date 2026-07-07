/**
 * Brain: Custom OpenAI-Compatible LLM Provider
 *
 * Implementation of LLMProvider for any OpenAI-compatible API endpoint
 * (e.g. OpenRouter, vLLM, DeepSeek, LMStudio).
 */

import type { LLMProvider, ProviderConfig } from "./provider";
import { GenericOpenAIProvider, buildGenericOpenAIConfig } from "./generic-openai-provider";

/**
 * OpenAI-compatible custom provider implementation.
 */
export class OpenAICompatProvider implements LLMProvider {
  readonly name = "openaicompat";
  private genericProvider: GenericOpenAIProvider;

  constructor(apiKey: string, baseUrl: string) {
    this.genericProvider = new GenericOpenAIProvider({
      name: "openaicompat",
      apiKey,
      baseUrl,
      supportsStrictSchema: true, // Enable JSON Schema strict mode for structured outputs
    });
  }

  async generate(prompt: string, config: ProviderConfig): Promise<string> {
    return this.genericProvider.generate(prompt, config);
  }
}

/**
 * Build Custom OpenAI-compatible config.
 */
export function buildOpenAICompatConfig(
  model: string,
  systemInstruction: string,
  maxOutputTokens: number,
  options?: { disableSchema?: boolean }
): ProviderConfig {
  return buildGenericOpenAIConfig(model, systemInstruction, maxOutputTokens, options);
}
