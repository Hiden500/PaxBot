/**
 * Zod schemas for all JSON boundaries in PaxBot.
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
// War Room: ownership_snapshot.json (written by Spy from parsed state)
// ---------------------------------------------------------------------------

export const OwnershipSnapshotSchema = z.object({
  our_nation: z.string(),
  regions_we_own: z.array(z.string()),
});

export type OwnershipSnapshot = z.infer<typeof OwnershipSnapshotSchema>;

// ---------------------------------------------------------------------------
// War Room: strategic_ledger.json (read/written by Brain)
// ---------------------------------------------------------------------------

export const OperationStepSchema = z.object({
  phase: z.number().nonnegative(),
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

export const MilestoneCheckSchema = z.object({
  milestone: z.string(),
  status: z.enum(["ACHIEVED", "NOT_ACHIEVED", "FAILED"]),
  evidence: z.string(),
});

export type MilestoneCheck = z.infer<typeof MilestoneCheckSchema>;

export const ActionBatchSchema = z.object({
  reasoning: z.string(),
  actions: z.array(z.string()),
  ledger_updates: z.array(OperationSchema),
  /** Optional: question to ask the in-game advisor on the NEXT turn (dynamic per turn). */
  next_advisor_query: z.string().max(500).optional(),
  /** Qualitative campaign objectives evaluation (Phase 6 Milestone Tracker) */
  milestone_checks: z.array(MilestoneCheckSchema),
  /** Brief list of immediate threats observed in current game state (Phase 8 Risk Engine) */
  immediate_risks: z.array(z.string()),
  /** Self-authored strategic direction — replaces static strategy-plan.json phases.
   *  LLM writes its own understanding of current phase, focus, and next milestones.
   *  Saved to strategic memory and fed back next turn. */
  strategic_direction_update: z.string().max(2000).optional(),
});

export type ActionBatch = z.infer<typeof ActionBatchSchema>;
