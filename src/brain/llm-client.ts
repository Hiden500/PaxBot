/**
 * Brain: LLM Client — Gemini 2.5 Flash wrapper.
 *
 * Uses @google/genai SDK with forced JSON output (responseMimeType +
 * responseSchema) so the model can only return valid, schema-constrained JSON.
 */

import { GoogleGenAI, Type } from "@google/genai";
import { existsSync } from "fs";
import { resolve } from "path";
import dotenv from "dotenv";

// Load .env (fall back to .env.example if .env doesn't exist)
const root = resolve(process.cwd());
const envPath = existsSync(resolve(root, ".env"))
  ? resolve(root, ".env")
  : resolve(root, ".env.example");
dotenv.config({ path: envPath });

// ---------------------------------------------------------------------------
// Gemini response schema (mirrors ActionBatchSchema from shared/schemas.ts)
// ---------------------------------------------------------------------------

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    reasoning: {
      type: Type.STRING,
      description:
        "Brief explanation of strategic thinking for this turn's decisions",
    },
    actions: {
      type: Type.ARRAY,
      items: {
        type: Type.STRING,
        description:
          "A plain-English directive to type into the game action box",
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
      description:
        "Updated or new operations to save in the strategic ledger",
    },
  },
  required: ["reasoning", "actions", "ledger_updates"],
};

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

const MODEL = "gemini-2.5-flash";

export async function callGemini(
  system: string,
  user: string
): Promise<string> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GOOGLE_API_KEY not set. Copy .env.example to .env and fill it in."
    );
  }

  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: MODEL,
    config: {
      systemInstruction: system,
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
      maxOutputTokens: 16384,
    },
    contents: user,
  });

  const text = response.text;
  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }

  return text;
}
