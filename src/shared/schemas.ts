/**
 * Zod schemas for all JSON boundaries in Pax-Automata.
 *
 * Every JSON file read/write and every LLM response gets validated here.
 * See CLAUDE.md §6 ("Zod at boundaries") and the Mermaid diagram for data-flow.
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// War Room: current_state.json (written by Spy)
// ---------------------------------------------------------------------------

export const GameStateSchema = z.object({
  current_state: z.string(),
});

export type GameState = z.infer<typeof GameStateSchema>;

// ---------------------------------------------------------------------------
// War Room: strategic_ledger.json (read/written by Brain)
// ---------------------------------------------------------------------------

export const OperationStepSchema = z.object({
  phase: z.number(),
  action: z.string(),
  status: z.enum(["COMPLETE", "PENDING", "FAILED"]),
});

export type OperationStep = z.infer<typeof OperationStepSchema>;

export const OperationSchema = z.object({
  operation_id: z.string(),
  goal: z.string(),
  current_phase: z.number(),
  steps: z.array(OperationStepSchema),
});

export type Operation = z.infer<typeof OperationSchema>;

export const StrategicLedgerSchema = z.object({
  active_operations: z.array(OperationSchema),
});

export type StrategicLedger = z.infer<typeof StrategicLedgerSchema>;

// ---------------------------------------------------------------------------
// Brain output: ActionBatch (LLM response, validated after parsing)
// ---------------------------------------------------------------------------

export const ActionBatchSchema = z.object({
  reasoning: z.string(),
  actions: z.array(z.string()),
  ledger_updates: z.array(OperationSchema),
});

export type ActionBatch = z.infer<typeof ActionBatchSchema>;
