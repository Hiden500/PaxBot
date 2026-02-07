/**
 * Pax-Automata — main entry point.
 *
 * Cognitive loop: Perception (Spy) → War Room → Brain → Execution (Hand)
 */

async function main() {
  console.log("Pax-Automata starting...");

  // TODO Phase 1: Launch Playwright, intercept /api/simple-chat → current_state.json
  // TODO Phase 2: Load War Room files (constitution, handbook, ledger)
  // TODO Phase 2.5: Query advisor for tactical insights
  // TODO Phase 3: Assemble context, run Brain LLM, produce action batch
  // TODO Phase 4: Execute action batch via Playwright Hand

  console.log("Pax-Automata ready. No phases implemented yet.");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
