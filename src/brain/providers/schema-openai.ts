/**
 * Shared JSON Schema format for OpenAI and OpenAI-Compatible providers
 * when using json_schema mode or strict JSON format.
 */

export const OPENAI_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    reasoning: {
      type: "string",
      description: "Brief explanation of strategic thinking for this turn's decisions",
    },
    actions: {
      type: "array",
      items: {
        type: "string",
        description: "A plain-text directive to type into the game action box",
      },
      description: "List of 3-8 game actions to execute this turn",
    },
    ledger_updates: {
      type: "array",
      items: {
        type: "object",
        properties: {
          operation_id: {
            type: "string",
            description: "Unique ID for this operation (e.g. OP_001)",
          },
          goal: {
            type: "string",
            description: "What this multi-turn operation aims to achieve",
          },
          current_phase: {
            type: "number",
            description: "Current phase number of the operation",
          },
          steps: {
            type: "array",
            items: {
              type: "object",
              properties: {
                phase: { type: "number", description: "Step phase number" },
                action: {
                  type: "string",
                  description: "What this step does",
                },
                status: {
                  type: "string",
                  description: "COMPLETE, PENDING, or FAILED",
                },
              },
              required: ["phase", "action", "status"],
            },
            description: "Ordered list of steps in this operation",
          },
        },
        required: ["operation_id", "goal", "current_phase", "steps"],
      },
      description: "Updated or new operations to save in the strategic ledger",
    },
    next_advisor_query: {
      type: "string",
      description:
        "One short question to ask the in-game advisor on the NEXT turn (e.g. about a specific front, nation, or decision). Keep under 100 words.",
    },
    milestone_checks: {
      type: "array",
      items: {
        type: "object",
        properties: {
          milestone: {
            type: "string",
            description: "The campaign objective or priority checked",
          },
          status: {
            type: "string",
            enum: ["ACHIEVED", "NOT_ACHIEVED", "FAILED"],
            description: "ACHIEVED, NOT_ACHIEVED, or FAILED",
          },
          evidence: {
            type: "string",
            description: "Direct text evidence from the game state",
          },
        },
        required: ["milestone", "status", "evidence"],
        additionalProperties: false,
      },
      description: "Evaluation of our progress against current campaign milestones/priorities",
    },
    immediate_risks: {
      type: "array",
      items: {
        type: "string",
      },
      description: "Brief list of immediate direct threats observed in current state",
    },
  },
  required: ["reasoning", "actions", "ledger_updates", "milestone_checks", "immediate_risks"],
  additionalProperties: false,
};
