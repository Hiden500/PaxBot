import * as readline from "readline";
import { assembleContext, buildPrompt } from "../src/brain/context-assembler";
import { callLLM } from "../src/brain/llm-client";
import { ActionBatchSchema } from "../src/shared";
import { parseOwnershipFromStateText } from "../src/spy/ownership-parser";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function main() {
  console.log("=== PaxBot — Ручное тестирование LLM ===\n");
  console.log("Как получить game state:");
  console.log("1. Откройте paxhistoria.co и войдите в игру");
  console.log("2. Откройте DevTools (F12) → Network → Fetch/XHR");
  console.log("3. Задайте вопрос in-game advisor'у (или нажмите конец хода)");
  console.log("4. Найдите запрос к API → вкладка Payload → скопируйте поле 'prompt'");
  console.log("5. Вставьте ниже и нажмите Enter дважды (пустая строка = конец)\n");
  console.log("Ожидание ввода (prompt):");

  let input = "";
  for await (const line of rl) {
    if (line.trim() === "") {
      break;
    }
    input += line + "\n";
  }

  if (!input.trim()) {
    console.log("Empty input. Exiting.");
    process.exit(0);
  }

  console.log("\n[1/4] Собираем контекст...");

  // Ensure session files exist to avoid ENOENT from assembleContext
  const { getSessionDir } = require("../src/shared/session");
  const fs = require("fs");
  const path = require("path");
  const sessionDir = getSessionDir();

  if (!fs.existsSync(path.join(sessionDir, "current_state.json"))) {
    fs.writeFileSync(
      path.join(sessionDir, "current_state.json"),
      JSON.stringify({ current_state: "" }),
      "utf-8"
    );
  }
  if (!fs.existsSync(path.join(sessionDir, "strategic_ledger.json"))) {
    fs.writeFileSync(
      path.join(sessionDir, "strategic_ledger.json"),
      JSON.stringify({ active_operations: [] }),
      "utf-8"
    );
  }

  // Assemble base context
  const ctx = assembleContext();

  // Override game state with user input
  // Since we are just testing LLM, we can fake the state saving or just inject it
  ctx.gameState = { current_state: input };

  const ownership = parseOwnershipFromStateText(input);
  if (ownership) {
    ctx.ownership = ownership;
    console.log(
      `[Spy] Опционально: Распознана страна ${ownership.our_nation}, регионов: ${ownership.regions_we_own.length}`
    );
  }

  console.log("[2/4] Формируем промпт...");
  const { system, user } = buildPrompt(ctx);

  console.log("[3/4] Отправляем запрос в LLM...");
  console.log(`System prompt: ${system.length} chars, User prompt: ${user.length} chars`);

  const startTime = Date.now();
  let rawResponse = "";
  try {
    rawResponse = await callLLM(system, user);
  } catch (err) {
    console.error("LLM Error:", err);
    process.exit(1);
  }
  const duration = Date.now() - startTime;

  console.log(`[4/4] Получен ответ (${duration}ms, ${rawResponse.length} chars)`);

  let parsed: any;
  try {
    parsed = JSON.parse(rawResponse.replace(/```json\n?|```/g, "").trim());
  } catch (err) {
    console.error("\n❌ Ошибка парсинга JSON:");
    console.log(rawResponse);
    process.exit(1);
  }

  // Validate format
  try {
    const batch = ActionBatchSchema.parse(parsed);
    console.log("\n✅ Формат корректен\n");
    console.log("=== REASONING ===");
    console.log(batch.reasoning);
    console.log("\n=== ACTIONS ===");
    batch.actions.forEach((a, i) => console.log(`  ${i + 1}. ${a}`));
    console.log("\n=== LEDGER UPDATES ===");
    batch.ledger_updates.forEach((op) => {
      console.log(`  [${op.operation_id}] ${op.goal} (phase ${op.current_phase})`);
      op.steps.forEach((s) => console.log(`    Phase ${s.phase}: ${s.action} [${s.status}]`));
    });
    console.log("\n=== NEXT ADVISOR QUERY ===");
    console.log(batch.next_advisor_query);
  } catch (err) {
    console.error("\n❌ Ошибка валидации схемы ActionBatch:");
    console.error(err);
    console.log("\nRaw JSON:");
    console.log(JSON.stringify(parsed, null, 2));
  }

  process.exit(0);
}

main();
