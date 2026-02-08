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
      // Update existing operation in-place
      ops[idx] = update;
    } else {
      // New operation — append
      ops.push(update);
    }
  }

  return { active_operations: ops };
}

function writeLedger(ledger: StrategicLedger): void {
  // Validate before writing
  StrategicLedgerSchema.parse(ledger);
  fs.writeFileSync(LEDGER_PATH, JSON.stringify(ledger, null, 2), "utf-8");
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

  console.log("[Brain] Calling Gemini 2.5 Flash...");
  const rawResponse = await callGemini(system, user);
  console.log(`[Brain] Gemini responded — ${rawResponse.length} chars`);

  // Parse + validate
  const parsed: unknown = JSON.parse(rawResponse);
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

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
