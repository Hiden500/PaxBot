import { ActionBatchSchema, type ActionBatch } from "../shared";

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
  try {
    parsed = JSON.parse(rawResponse) as Record<string, unknown>;
  } catch (err) {
    // Write full failed LLM response to file for debugging
    try {
      const failedPath = path.join(getSessionDir(), "failed_llm_response.txt");
      fs.writeFileSync(failedPath, rawResponse, "utf-8");
      console.error(`[Мозг] Ошибка парсинга LLM. Полный ответ сохранен в: ${failedPath}`);
    } catch (writeErr) {
      console.error(
        `[Мозг] Не удалось записать failed_llm_response.txt: ${(writeErr as Error).message}`
      );
    }

    throw new Error(
      `Не удалось распарсить JSON ответ от LLM (${rawResponse.length} симв., начинается с: "${rawResponse.slice(0, 150)}"): ${(err as Error).message}`
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
      console.error(`[Мозг] Ошибка схемы Zod. Полный ответ сохранен в: ${failedPath}`);
    } catch (writeErr) {
      /* ignore */
    }
    throw err;
  }
}
