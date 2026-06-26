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

export function parseLLMResponse(rawResponse: string): ActionBatch {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(rawResponse) as Record<string, unknown>;
  } catch (err) {
    throw new Error(
      `Failed to parse LLM response (${rawResponse.length} chars, starts: ${rawResponse.slice(0, 100)}): ${(err as Error).message}`
    );
  }
  normalizeStatuses(parsed);
  return ActionBatchSchema.parse(parsed);
}
