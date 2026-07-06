import type { LLMProvider, ProviderConfig } from "./provider";
import { OPENAI_RESPONSE_SCHEMA } from "./schema-openai";

export interface GenericOpenAIConfig {
  name: string;
  apiKey: string;
  baseUrl: string;
  /** Whether the API supports strict JSON Schema (like OpenAI) or needs json_object (like Groq) */
  supportsStrictSchema: boolean;
}

export class GenericOpenAIProvider implements LLMProvider {
  readonly name: string;
  private apiKey: string;
  private baseUrl: string;
  private supportsStrictSchema: boolean;

  constructor(config: GenericOpenAIConfig) {
    this.name = config.name;
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl;
    this.supportsStrictSchema = config.supportsStrictSchema;
  }

  async generate(prompt: string, config: ProviderConfig): Promise<string> {
    const isJsonRequested = config.responseMimeType === "application/json";

    // Determine response_format based on provider capabilities and requested type
    let response_format;
    if (isJsonRequested) {
      if (this.supportsStrictSchema && config.responseSchema) {
        response_format = {
          type: "json_schema",
          json_schema: {
            name: "action_batch",
            strict: true,
            schema: config.responseSchema,
          },
        };
      } else {
        response_format = { type: "json_object" };
      }
    }

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
        response_format,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new Error(`${this.name} API error (${response.status}): ${errorText.slice(0, 200)}`);
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string | null } }>;
    };

    const text = data.choices?.[0]?.message?.content;
    if (!text) {
      throw new Error(`${this.name} returned an empty response.`);
    }

    return text;
  }
}

/**
 * Helper to build config for generic OpenAI-compatible providers.
 */
export function buildGenericOpenAIConfig(
  model: string,
  systemInstruction: string,
  maxOutputTokens: number,
  options?: { disableSchema?: boolean }
): ProviderConfig {
  return {
    model,
    systemInstruction,
    responseMimeType: options?.disableSchema ? undefined : "application/json",
    responseSchema: options?.disableSchema ? undefined : OPENAI_RESPONSE_SCHEMA,
    maxOutputTokens,
  };
}
