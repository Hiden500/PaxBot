/**
 * Brain: Groq LLM Provider
 *
 * Implementation of LLMProvider for Groq (via OpenAI-compatible API).
 * Uses function calling / structured output via response_format.
 */

import type { LLMProvider, ProviderConfig } from "./provider";

/**
 * Groq provider implementation.
 * Uses OpenAI-compatible chat completions endpoint.
 */
export class GroqProvider implements LLMProvider {
  readonly name = "groq";

  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl = "https://api.groq.com/openai/v1") {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async generate(prompt: string, config: ProviderConfig): Promise<string> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          {
            role: "system",
            content: config.systemInstruction ?? "",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: config.maxOutputTokens,
        response_format:
          config.responseMimeType === "application/json" ? { type: "json_object" } : undefined,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new Error(`Groq API error (${response.status}): ${errorText.slice(0, 200)}`);
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string | null } }>;
    };

    const text = data.choices?.[0]?.message?.content;
    if (!text) {
      throw new Error("Groq returned an empty response.");
    }

    return text;
  }
}

/**
 * Build Groq-specific config.
 */
export function buildGroqConfig(
  model: string,
  systemInstruction: string,
  maxOutputTokens: number,
  options?: { disableSchema?: boolean }
): ProviderConfig {
  return {
    model,
    systemInstruction,
    responseMimeType: options?.disableSchema ? undefined : "application/json",
    maxOutputTokens,
  };
}
