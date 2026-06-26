/**
 * Brain: OpenAI LLM Provider
 *
 * Implementation of LLMProvider for OpenAI (chat completions API).
 * Supports structured JSON output via response_format: json_schema.
 */

import type { LLMProvider, ProviderConfig } from "./provider";

/**
 * OpenAI provider implementation.
 */
export class OpenAIProvider implements LLMProvider {
  readonly name = "openai";

  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl = "https://api.openai.com/v1") {
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
          config.responseMimeType === "application/json" && config.responseSchema
            ? {
                type: "json_schema",
                json_schema: {
                  name: "action_batch",
                  strict: true,
                  schema: config.responseSchema,
                },
              }
            : config.responseMimeType === "application/json"
              ? { type: "json_object" }
              : undefined,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new Error(`OpenAI API error (${response.status}): ${errorText.slice(0, 200)}`);
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string | null } }>;
    };

    const text = data.choices?.[0]?.message?.content;
    if (!text) {
      throw new Error("OpenAI returned an empty response.");
    }

    return text;
  }
}

/**
 * Build OpenAI-compatible config.
 * Converts Gemini-style responseSchema to JSON Schema for OpenAI's json_schema mode.
 */
export function buildOpenAIConfig(
  model: string,
  systemInstruction: string,
  maxOutputTokens: number
): ProviderConfig {
  return {
    model,
    systemInstruction,
    responseMimeType: "application/json",
    responseSchema: OPENAI_RESPONSE_SCHEMA,
    maxOutputTokens,
  };
}

// ---------------------------------------------------------------------------
// OpenAI response schema (JSON Schema format for json_schema mode)
// ---------------------------------------------------------------------------

const OPENAI_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    reasoning: {
      type: "string",
      description: "Brief explanation of strategic thinking for this turn's decisions",
    },
    actions: {
      type: "array",
      items: {
        type: "string",
        description: "A plain-English directive to type into the game action box",
      },
      description: "List of 3-8 game actions to execute this turn",
    },
    ledger_updates: {
      type: "array",
      items: {
        type: "object",
        properties: {
          operation_id: {
            type: "string",
            description: "Unique ID for this operation (e.g. OP_001)",
          },
          goal: {
            type: "string",
            description: "What this multi-turn operation aims to achieve",
          },
          current_phase: {
            type: "number",
            description: "Current phase number of the operation",
          },
          steps: {
            type: "array",
            items: {
              type: "object",
              properties: {
                phase: { type: "number", description: "Step phase number" },
                action: {
                  type: "string",
                  description: "What this step does",
                },
                status: {
                  type: "string",
                  description: "COMPLETE, PENDING, or FAILED",
                },
              },
              required: ["phase", "action", "status"],
            },
            description: "Ordered list of steps in this operation",
          },
        },
        required: ["operation_id", "goal", "current_phase", "steps"],
      },
      description: "Updated or new operations to save in the strategic ledger",
    },
    next_advisor_query: {
      type: "string",
      description:
        "One short question to ask the in-game advisor on the NEXT turn (e.g. about a specific front, nation, or decision). Keep under 100 words.",
    },
  },
  required: ["reasoning", "actions", "ledger_updates"],
};
