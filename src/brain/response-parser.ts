import { ActionBatchSchema, type ActionBatch, t } from "../shared";

export const VALID_STATUSES = new Set(["COMPLETE", "PENDING", "FAILED"]);

export function normalizeStatuses(obj: Record<string, unknown>): void {
  const updates = obj.ledger_updates;
  if (!Array.isArray(updates)) {
    return;
  }

  for (const op of updates) {
    if (op && typeof op === "object" && Array.isArray((op as Record<string, unknown>).steps)) {
      for (const step of (op as Record<string, unknown>).steps as Record<string, unknown>[]) {
        if (step && typeof step.status === "string") {
          const upper = step.status.toUpperCase();
          step.status = VALID_STATUSES.has(upper) ? upper : "PENDING";
        }
      }
    }
  }
}

import * as fs from "fs";
import * as path from "path";
import { getSessionDir } from "../shared/session";

export function parseLLMResponse(rawResponse: string): ActionBatch {
  let parsed: Record<string, unknown>;
  let cleanedResponse = rawResponse.trim();

  // Extract JSON from Markdown code blocks (```json ... ```)
  const jsonBlockRegex = /```json\s*([\s\S]*?)\s*```/;
  const match = cleanedResponse.match(jsonBlockRegex);
  if (match && match[1]) {
    cleanedResponse = match[1].trim();
  } else {
    // Fallback: extract substring between first '{' and last '}'
    const firstBrace = cleanedResponse.indexOf("{");
    const lastBrace = cleanedResponse.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleanedResponse = cleanedResponse.slice(firstBrace, lastBrace + 1).trim();
    }
  }

  try {
    parsed = JSON.parse(cleanedResponse) as Record<string, unknown>;
  } catch (err) {
    // Write full failed LLM response to file for debugging
    try {
      const failedPath = path.join(getSessionDir(), "failed_llm_response.txt");
      fs.writeFileSync(failedPath, rawResponse, "utf-8");
      console.error(t("brain.write_debug_saved").replace("{path}", failedPath));
    } catch (writeErr) {
      console.error(t("brain.write_debug_err").replace("{error}", (writeErr as Error).message));
    }

    throw new Error(
      t("brain.parse_json_err")
        .replace("{cleanedLen}", String(cleanedResponse.length))
        .replace("{rawStart}", rawResponse.slice(0, 150))
        .replace("{error}", (err as Error).message)
    );
  }
  normalizeStatuses(parsed);
  try {
    return ActionBatchSchema.parse(parsed);
  } catch (err) {
    // Zod validation error - also save to debug file
    try {
      const failedPath = path.join(getSessionDir(), "failed_llm_response.txt");
      fs.writeFileSync(failedPath, rawResponse, "utf-8");
      console.error(t("brain.write_zod_saved").replace("{path}", failedPath));
    } catch (writeErr) {
      /* ignore */
    }
    throw err;
  }
}
