import * as fs from "fs";
import * as path from "path";
import {
  StrategicLedgerSchema,
  type Operation,
  type StrategicLedger,
  getSessionDir,
} from "../shared";
import { LEDGER_CONFIG, PATHS } from "../shared/config";

export function mergeLedger(existing: StrategicLedger, updates: Operation[]): StrategicLedger {
  const ops = [...existing.active_operations];

  for (const update of updates) {
    const idx = ops.findIndex((op) => op.operation_id === update.operation_id);
    if (idx >= 0) {
      // Merge: keep existing COMPLETE steps, add/update PENDING/FAILED from LLM
      const existingComplete = ops[idx].steps.filter((s) => s.status === "COMPLETE");
      const merged = {
        ...update,
        steps: [...existingComplete, ...update.steps],
      };
      ops[idx] = merged;
    } else {
      // New operation — append
      ops.push(update);
    }
  }

  return { active_operations: ops };
}

/** Remove fully-finished operations, and trim old COMPLETE steps from active ones. */
export function pruneLedger(ledger: StrategicLedger): StrategicLedger {
  // 1. Drop operations with no PENDING steps
  const active = ledger.active_operations.filter((op) =>
    op.steps.some((s) => s.status === "PENDING")
  );
  const opsDropped = ledger.active_operations.length - active.length;
  if (opsDropped > 0) {
    console.log(`[Brain] Pruned ${opsDropped} finished operation(s) from ledger`);
  }

  // 2. Trim old COMPLETE steps — keep only the most recent N per operation
  let stepsDropped = 0;
  const trimmed = active.map((op) => {
    const complete = op.steps.filter((s) => s.status === "COMPLETE");
    const other = op.steps.filter((s) => s.status !== "COMPLETE");

    if (complete.length <= LEDGER_CONFIG.MAX_COMPLETE_STEPS_PER_OP) {
      return op;
    }

    const dropped = complete.length - LEDGER_CONFIG.MAX_COMPLETE_STEPS_PER_OP;
    stepsDropped += dropped;
    // Keep only the last N complete steps (most recent phases)
    const kept = complete.slice(-LEDGER_CONFIG.MAX_COMPLETE_STEPS_PER_OP);
    return { ...op, steps: [...kept, ...other] };
  });

  if (stepsDropped > 0) {
    console.log(`[Brain] Trimmed ${stepsDropped} old COMPLETE step(s) from ledger`);
  }

  return { active_operations: trimmed };
}

export function writeLedger(ledger: StrategicLedger): void {
  const sessionDir = getSessionDir();
  const ledgerPath = path.join(sessionDir, PATHS.STRATEGIC_LEDGER);
  const pruned = pruneLedger(ledger);
  StrategicLedgerSchema.parse(pruned);
  fs.writeFileSync(ledgerPath, JSON.stringify(pruned, null, 2), "utf-8");
}
