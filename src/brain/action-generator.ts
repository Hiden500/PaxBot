/**
 * Brain: Action Generator — orchestrator and standalone entry point.
 *
 * Follows the Mermaid diagram flow:
 *   Phase 2 (Context Assembly) → Phase 3 (Reasoning) → Pre-execution ledger write
 *
 * Exports generateActions() for the cognitive loop, and has a main() for
 * standalone testing via `npm run brain`.
 */

import * as fs from "fs";
import * as path from "path";
import {
  ActionBatchSchema,
  StrategicLedgerSchema,
  type ActionBatch,
  type Operation,
  type StrategicLedger,
} from "../shared";
import { assembleContext, buildPrompt } from "./context-assembler";
import { callGemini } from "./llm-client";

// ---------------------------------------------------------------------------
// Ledger merge logic
// ---------------------------------------------------------------------------

const LEDGER_PATH = path.join(process.cwd(), "war-room", "strategic_ledger.json");

function mergeLedger(
  existing: StrategicLedger,
  updates: Operation[]
): StrategicLedger {
  const ops = [...existing.active_operations];

  for (const update of updates) {
    const idx = ops.findIndex(
      (op) => op.operation_id === update.operation_id
    );
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

/** Max COMPLETE steps to retain per operation — older ones are trimmed to save space. */
const MAX_COMPLETE_STEPS_PER_OP = 5;

/** Remove fully-finished operations, and trim old COMPLETE steps from active ones. */
function pruneLedger(ledger: StrategicLedger): StrategicLedger {
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

    if (complete.length <= MAX_COMPLETE_STEPS_PER_OP) return op;

    const dropped = complete.length - MAX_COMPLETE_STEPS_PER_OP;
    stepsDropped += dropped;
    // Keep only the last N complete steps (most recent phases)
    const kept = complete.slice(-MAX_COMPLETE_STEPS_PER_OP);
    return { ...op, steps: [...kept, ...other] };
  });

  if (stepsDropped > 0) {
    console.log(`[Brain] Trimmed ${stepsDropped} old COMPLETE step(s) from ledger`);
  }

  return { active_operations: trimmed };
}

function writeLedger(ledger: StrategicLedger): void {
  const pruned = pruneLedger(ledger);
  StrategicLedgerSchema.parse(pruned);
  fs.writeFileSync(LEDGER_PATH, JSON.stringify(pruned, null, 2), "utf-8");
}

// ---------------------------------------------------------------------------
// Status normalization (Gemini sometimes returns non-uppercase values)
// ---------------------------------------------------------------------------

const VALID_STATUSES = new Set(["COMPLETE", "PENDING", "FAILED"]);

function normalizeStatuses(obj: Record<string, unknown>): void {
  const updates = obj.ledger_updates;
  if (!Array.isArray(updates)) return;

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

// ---------------------------------------------------------------------------
// Main pipeline
// ---------------------------------------------------------------------------

export async function generateActions(): Promise<ActionBatch> {
  // Phase 2: Context Assembly
  console.log("[Brain] Phase 2: Assembling context from War Room files...");
  const ctx = assembleContext();
  console.log(
    `[Brain] Context loaded — game state: ${ctx.gameState.current_state.length} chars, ` +
      `operations: ${ctx.ledger.active_operations.length}, ` +
      `advisor: ${ctx.advisorResponse ? "yes" : "none"}`
  );

  // Phase 3: Reasoning
  console.log("[Brain] Phase 3: Building prompt...");
  const { system, user } = buildPrompt(ctx);
  console.log(
    `[Brain] Prompt built — system: ${system.length} chars, user: ${user.length} chars`
  );

  console.log("\n════════════════════════════════════════════════════════");
  console.log("  BRAIN: STRATEGIC PLANNING IN PROGRESS");
  console.log("  Reading constitution, crisis handbook, strategic ledger...");
  console.log("  Analyzing game state, advisor intel, and active operations...");
  console.log("  Generating actions via Gemini 2.5 Flash...");
  console.log("════════════════════════════════════════════════════════\n");
  const rawResponse = await callGemini(system, user);
  console.log(`[Brain] Gemini responded — ${rawResponse.length} chars`);

  // Parse + normalize + validate
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(rawResponse) as Record<string, unknown>;
  } catch (err) {
    throw new Error(
      `Failed to parse Gemini response (${rawResponse.length} chars, starts: ${rawResponse.slice(0, 100)}): ${(err as Error).message}`
    );
  }
  normalizeStatuses(parsed);
  const batch = ActionBatchSchema.parse(parsed);
  console.log(
    `[Brain] Validated — ${batch.actions.length} actions, ${batch.ledger_updates.length} ledger updates`
  );

  // Phase 3, step 5: Pre-execution ledger write
  if (batch.ledger_updates.length > 0) {
    const merged = mergeLedger(ctx.ledger, batch.ledger_updates);
    writeLedger(merged);
    console.log(
      `[Brain] Ledger updated — ${merged.active_operations.length} total operations`
    );
  }

  return batch;
}

// ---------------------------------------------------------------------------
// Standalone entry point: npm run brain
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log("=== Pax-Automata Brain — Standalone Test ===\n");

  const batch = await generateActions();

  console.log("\n=== REASONING ===");
  console.log(batch.reasoning);

  console.log("\n=== ACTIONS ===");
  for (let i = 0; i < batch.actions.length; i++) {
    console.log(`  ${i + 1}. ${batch.actions[i]}`);
  }

  console.log("\n=== LEDGER UPDATES ===");
  for (const op of batch.ledger_updates) {
    console.log(`  [${op.operation_id}] ${op.goal} (phase ${op.current_phase})`);
    for (const step of op.steps) {
      console.log(`    Phase ${step.phase}: ${step.action} [${step.status}]`);
    }
  }

  console.log("\nDone.");
}

// Only run standalone when invoked directly via `npm run brain`
if (process.argv[1]?.includes("action-generator")) {
  main().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
}
