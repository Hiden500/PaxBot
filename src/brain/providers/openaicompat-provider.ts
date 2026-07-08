/**
 * Brain: Custom OpenAI-Compatible LLM Provider
 *
 * Implementation of LLMProvider for any OpenAI-compatible API endpoint
 * (e.g. OpenRouter, vLLM, DeepSeek, LMStudio).
 */

import type { LLMProvider, ProviderConfig } from "./provider";
import { GenericOpenAIProvider, buildGenericOpenAIConfig } from "./generic-openai-provider";

/**
 * OpenAI-compatible custom provider implementation.
 */
export class OpenAICompatProvider implements LLMProvider {
  readonly name = "openaicompat";
  private genericProvider: GenericOpenAIProvider;

  constructor(apiKey: string, baseUrl: string) {
    this.genericProvider = new GenericOpenAIProvider({
      name: "openaicompat",
      apiKey,
      baseUrl,
      supportsStrictSchema: true, // Enable JSON Schema strict mode for structured outputs
    });
  }

  async generate(prompt: string, config: ProviderConfig): Promise<string> {
    return this.genericProvider.generate(prompt, config);
  }
}

/**
 * Build Custom OpenAI-compatible config.
 */
export function buildOpenAICompatConfig(
  model: string,
  systemInstruction: string,
  maxOutputTokens: number,
  options?: { disableSchema?: boolean }
): ProviderConfig {
  const schemaInstructions = options?.disableSchema
    ? ""
    : `

CRITICAL: You MUST respond with a valid JSON object matching exactly this schema structure.
Do NOT wrap the response in markdown or chat greetings. Output ONLY the JSON object.

JSON Schema structure:
{
  "reasoning": "Brief explanation of strategic thinking for this turn's decisions",
  "actions": ["A plain-text directive to type into the game action box"],
  "ledger_updates": [
    {
      "operation_id": "Unique ID (e.g. OP_001)",
      "goal": "What this multi-turn operation aims to achieve",
      "current_phase": 1, // Number
      "steps": [
        {
          "phase": 1, // Number
          "action": "What this step does",
          "status": "COMPLETE, PENDING, or FAILED"
        }
      ]
    }
  ],
  "next_advisor_query": "One short question to ask the in-game advisor on the NEXT turn",
  "milestone_checks": [
    {
      "milestone": "The campaign objective or priority checked",
      "status": "ACHIEVED, NOT_ACHIEVED, or FAILED",
      "evidence": "Direct text evidence from the game state"
    }
  ],
  "immediate_risks": ["Brief list of immediate direct threats observed in current state"]
}

Ensure that all JSON keys are present in the root object, even if they are empty arrays.`;

  return buildGenericOpenAIConfig(
    model,
    systemInstruction + schemaInstructions,
    maxOutputTokens,
    options
  );
}
