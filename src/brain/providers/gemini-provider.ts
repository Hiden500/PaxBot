/**
 * Brain: Gemini LLM Provider
 *
 * Implementation of LLMProvider for Google Gemini (via @google/genai SDK).
 * Uses forced JSON output (responseMimeType + responseSchema).
 */

import { GoogleGenAI, Type } from "@google/genai";
import type { LLMProvider, ProviderConfig } from "./provider";

/**
 * Gemini provider implementation.
 */
export class GeminiProvider implements LLMProvider {
  readonly name = "gemini";

  private client: GoogleGenAI;

  constructor(apiKey: string) {
    this.client = new GoogleGenAI({ apiKey });
  }

  async generate(prompt: string, config: ProviderConfig): Promise<string> {
    const response = await this.client.models.generateContent({
      model: config.model,
      config: {
        systemInstruction: config.systemInstruction,
        responseMimeType: config.responseMimeType ?? "application/json",
        responseSchema: config.responseSchema,
        maxOutputTokens: config.maxOutputTokens,
      },
      contents: prompt,
    });

    const text = response.text;
    if (!text) {
      throw new Error("Gemini returned an empty response.");
    }

    return text;
  }
}

/**
 * Build Gemini-specific config from the shared RESPONSE_SCHEMA.
 */
export function buildGeminiConfig(
  model: string,
  systemInstruction: string,
  maxOutputTokens: number,
  options?: { disableSchema?: boolean }
): ProviderConfig {
  return {
    model,
    systemInstruction,
    responseMimeType: "application/json",
    responseSchema: options?.disableSchema ? undefined : GEMINI_RESPONSE_SCHEMA,
    maxOutputTokens,
  };
}

// ---------------------------------------------------------------------------
// Gemini response schema (mirrors ActionBatchSchema from shared/schemas.ts)
// ---------------------------------------------------------------------------

const GEMINI_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    reasoning: {
      type: Type.STRING,
      description: "Brief explanation of strategic thinking for this turn's decisions",
    },
    actions: {
      type: Type.ARRAY,
      items: {
        type: Type.STRING,
        description: "A plain-English directive to type into the game action box",
      },
      description: "List of 3-8 game actions to execute this turn",
    },
    ledger_updates: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          operation_id: {
            type: Type.STRING,
            description: "Unique ID for this operation (e.g. OP_001)",
          },
          goal: {
            type: Type.STRING,
            description: "What this multi-turn operation aims to achieve",
          },
          current_phase: {
            type: Type.NUMBER,
            description: "Current phase number of the operation",
          },
          steps: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                phase: { type: Type.NUMBER, description: "Step phase number" },
                action: {
                  type: Type.STRING,
                  description: "What this step does",
                },
                status: {
                  type: Type.STRING,
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
      type: Type.STRING,
      description:
        "One short question to ask the in-game advisor on the NEXT turn (e.g. about a specific front, nation, or decision). Keep under 100 words.",
    },
  },
  required: ["reasoning", "actions", "ledger_updates"],
};
