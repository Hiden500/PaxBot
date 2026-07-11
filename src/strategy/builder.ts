import { callLLM } from "../brain/llm-client";
import type { StrategyPlan } from "./types";
import type { Campaign } from "../campaign/types";
import { saveStrategyPlan } from "./planner";

const SYSTEM_PROMPT = `You are a Strategic Planner for PaxBot.
Given a Campaign definition (which includes priorities, constraints, and victory conditions), you must generate a phased StrategyPlan in JSON format.

The StrategyPlan must be tailored SPECIFICALLY to the priorities, constraints, and victory conditions defined in the campaign.
- Ensure that the exitConditions of phases are measurable and relate directly to the victoryConditions and priorities.
- Do NOT use generic placeholder phase names (like "Stabilization", "Economic Expansion"). Instead, name and align the phases with the campaign's specific objectives and constraints (e.g., for Russia 2050: "Технологический суверенитет и демография", "Евразийская интеграция", "Глобальный суверенный центр").
- The JSON response must be in the same language as the Campaign's text fields (e.g., if the Campaign is in Russian, the phase names, descriptions, and conditions must be in Russian).

The JSON must strictly follow this schema without markdown wrapping:
{
  "name": "Name of the strategy plan",
  "country": "Target country",
  "phases": [
    {
      "name": "Phase name",
      "description": "Short description",
      "entryConditions": ["Condition 1"],
      "exitConditions": ["Condition 1", "Condition 2"],
      "focusAreas": ["area1", "area2"],
      "minTurns": number (usually 5 to 15)
    }
  ],
  "currentPhaseIndex": 0,
  "turnsInCurrentPhase": 0
}

Rules:
1. Generate exactly 3 to 5 phases that logically progress from the current state to the campaign's superGoal.
2. The country must match the Campaign's country.
3. Keep descriptions and conditions concise but measurable.
4. Return ONLY valid JSON, no markdown formatting.`;

export async function buildStrategyPlanFromCampaign(
  campaign: Campaign
): Promise<StrategyPlan | null> {
  console.log(`[Strategy Builder] Generating StrategyPlan for campaign "${campaign.name}"...`);

  try {
    const rawResponse = await callLLM(SYSTEM_PROMPT, JSON.stringify(campaign, null, 2), {
      disableSchema: true,
    });

    let parsed: any;
    try {
      let jsonString = rawResponse;
      const match = rawResponse.match(/\{[\s\S]*\}/);
      if (match) {
        jsonString = match[0];
      } else {
        jsonString = rawResponse.replace(/```json\n?|```/g, "").trim();
      }
      parsed = JSON.parse(jsonString);
    } catch {
      console.error("[Strategy Builder] Failed to parse LLM response as JSON. Raw response:");
      console.error(rawResponse);
      return null;
    }

    const plan = parsed as StrategyPlan;

    // Ensure base fields
    plan.currentPhaseIndex = 0;
    plan.turnsInCurrentPhase = 0;

    saveStrategyPlan(plan);
    return plan;
  } catch (err) {
    console.error(`[Strategy Builder] Error: ${(err as Error).message}`);
    return null;
  }
}
