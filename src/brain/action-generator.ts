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
import { type ActionBatch, tui } from "../shared";
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
  tui.setStatus("Мозг: Сбор контекста...");
  tui.log("[Мозг] Фаза 2: Сбор контекста из файлов War Room...");
  const ctx = assembleContext();
  tui.log(
    `[Мозг] Контекст загружен — состояние игры: ${ctx.gameState.current_state.length} симв., ` +
      `операций в журнале: ${ctx.ledger.active_operations.length}`
  );
  tui.setOperations(ctx.ledger.active_operations);

  // Phase 3: Reasoning
  tui.setStatus("Мозг: Сборка промпта...");
  tui.log("[Мозг] Фаза 3: Сборка промпта...");
  const { system, user } = buildPrompt(ctx);
  tui.log(
    `[Мозг] Промпт собран — системный: ${system.length} симв., пользовательский: ${user.length} симв.`
  );

  tui.setStatus("Мозг: Ожидание ответа LLM...");
  tui.log("[Мозг] Запрос к LLM (Стратегическое планирование)...");
  const rawResponse = await callLLM(system, user);
  tui.log(`[Мозг] LLM ответила — ${rawResponse.length} симв.`);

  // Parse + normalize + validate
  tui.setStatus("Мозг: Анализ ответа...");
  const batch = parseLLMResponse(rawResponse);
  tui.log(
    `[Мозг] Ответ валидирован — действий: ${batch.actions.length}, обновлений леджера: ${batch.ledger_updates.length}`
  );

  // Phase 3, step 5: Pre-execution ledger write
  if (batch.ledger_updates.length > 0) {
    const merged = mergeLedger(ctx.ledger, batch.ledger_updates);
    writeLedger(merged);
    tui.setOperations(merged.active_operations);
    tui.log(`[Мозг] Леджер обновлен — всего операций: ${merged.active_operations.length}`);
  }

  // Persist dynamic advisor query for next turn (no extra API call)
  const nextQuery = batch.next_advisor_query?.trim() ?? "";
  if (nextQuery) {
    const nextQueryPath = path.join(getSessionDir(), PATHS.NEXT_ADVISOR_QUERY);
    fs.writeFileSync(nextQueryPath, nextQuery, "utf-8");
    tui.setAdvisorQuery(nextQuery);
    tui.log(
      `[Мозг] Установлен следующий вопрос советнику: "${nextQuery.length > 55 ? nextQuery.slice(0, 55) + "..." : nextQuery}"`
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
