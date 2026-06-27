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
import { type ActionBatch } from "../shared";
import { assembleContext, buildPrompt } from "./context-assembler";
import { callLLM } from "./llm-client";
import { PATHS } from "../shared/config";
import { getSessionDir } from "../shared/session";
import { mergeLedger, writeLedger } from "./ledger-manager";
import { parseLLMResponse } from "./response-parser";

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
  console.log(`[Brain] Prompt built — system: ${system.length} chars, user: ${user.length} chars`);

  console.log("\n════════════════════════════════════════════════════════");
  console.log("  BRAIN: STRATEGIC PLANNING IN PROGRESS");
  console.log("  Reading constitution, crisis handbook, strategic ledger...");
  console.log("  Analyzing game state, advisor intel, and active operations...");
  console.log("  Generating actions via LLM...");
  console.log("════════════════════════════════════════════════════════\n");
  const rawResponse = await callLLM(system, user);
  console.log(`[Brain] LLM responded — ${rawResponse.length} chars`);

  // Parse + normalize + validate
  const batch = parseLLMResponse(rawResponse);
  console.log(
    `[Brain] Validated — ${batch.actions.length} actions, ${batch.ledger_updates.length} ledger updates`
  );

  // Phase 3, step 5: Pre-execution ledger write
  if (batch.ledger_updates.length > 0) {
    const merged = mergeLedger(ctx.ledger, batch.ledger_updates);
    writeLedger(merged);
    console.log(`[Brain] Ledger updated — ${merged.active_operations.length} total operations`);
  }

  // Persist dynamic advisor query for next turn (no extra API call)
  const nextQuery = batch.next_advisor_query?.trim() ?? "";
  if (nextQuery) {
    const nextQueryPath = path.join(getSessionDir(), PATHS.NEXT_ADVISOR_QUERY);
    fs.writeFileSync(nextQueryPath, nextQuery, "utf-8");
    console.log(
      `[Brain] Next advisor query set: "${nextQuery.length > 55 ? nextQuery.slice(0, 55) + "..." : nextQuery}"`
    );
  }

  return batch;
}

// ---------------------------------------------------------------------------
// Standalone entry point: npm run brain
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log("=== PaxBot Brain — Standalone Test ===\n");

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
