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
import { LLM_CONFIG } from "../shared/config";

// Load .env (fall back to .env.example if .env doesn't exist)
const root = resolve(process.cwd());
const envPath = existsSync(resolve(root, ".env"))
  ? resolve(root, ".env")
  : resolve(root, ".env.example");
dotenv.config({ path: envPath });

/**
 * Validate all required environment variables at startup.
 * Throws immediately if anything is missing, with a clear message.
 */
export function validateEnv(): void {
  const required = {
    GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
  };

  const missing = Object.entries(required)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}.\n` +
        `Copy .env.example to .env and fill in the values.`
    );
  }
}

// ---------------------------------------------------------------------------
// Gemini response schema (mirrors ActionBatchSchema from shared/schemas.ts)
// ---------------------------------------------------------------------------

const RESPONSE_SCHEMA = {
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

// ---------------------------------------------------------------------------
// Retry config
// ---------------------------------------------------------------------------

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export async function callGemini(system: string, user: string): Promise<string> {
  validateEnv();

  const apiKey = process.env.GOOGLE_API_KEY!;
  const ai = new GoogleGenAI({ apiKey });

  let lastError: Error | null = null;
  const startTime = Date.now();
  const promptLength = system.length + user.length;

  for (let attempt = 1; attempt <= LLM_CONFIG.RETRY_MAX_ATTEMPTS; attempt++) {
    try {
      const attemptStart = Date.now();
      const response = await ai.models.generateContent({
        model: LLM_CONFIG.MODEL,
        config: {
          systemInstruction: system,
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
          maxOutputTokens: LLM_CONFIG.MAX_OUTPUT_TOKENS,
        },
        contents: user,
      });

      const text = response.text;
      if (!text) {
        throw new Error("Gemini returned an empty response.");
      }

      const attemptDuration = Date.now() - attemptStart;
      const totalDuration = Date.now() - startTime;

      console.log(
        `[LLM] Success on attempt ${attempt}/${LLM_CONFIG.RETRY_MAX_ATTEMPTS}. ` +
          `Prompt: ${promptLength} chars, Response: ${text.length} chars. ` +
          `Time: ${attemptDuration}ms (total: ${totalDuration}ms)`
      );

      return text;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < LLM_CONFIG.RETRY_MAX_ATTEMPTS) {
        const delay = LLM_CONFIG.RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
        console.log(
          `[LLM] Attempt ${attempt}/${LLM_CONFIG.RETRY_MAX_ATTEMPTS} failed: ${lastError.message.slice(0, 100)}. ` +
            `Retrying in ${delay}ms...`
        );
        await sleep(delay);
      }
    }
  }

  const totalDuration = Date.now() - startTime;
  console.log(
    `[LLM] All ${LLM_CONFIG.RETRY_MAX_ATTEMPTS} attempts failed. Total time: ${totalDuration}ms`
  );

  throw lastError ?? new Error("Gemini call failed after retries.");
}
