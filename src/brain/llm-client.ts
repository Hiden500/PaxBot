/**
 * Brain: LLM Client — provider-agnostic wrapper.
 *
 * Selects the LLM provider based on configuration/env,
 * builds the appropriate config, and calls with retry logic.
 * All provider-specific implementations are in src/brain/providers/.
 */

import type { LLMProvider, ProviderConfig } from "./providers/provider";
import { createProvider, callProviderWithRetry, validateEnv } from "./providers/registry";
import { buildGeminiConfig } from "./providers/gemini-provider";
import { buildGroqConfig } from "./providers/groq-provider";
import { buildOpenAIConfig } from "./providers/openai-provider";
import { LLM_CONFIG, DEFAULT_LLM_PROVIDER, PROVIDER_MODELS } from "../shared/config";
import type { ProviderType } from "./providers/registry";

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let provider: LLMProvider | null = null;

/**
 * Get or initialize the LLM provider.
 */
function getProvider(): LLMProvider {
  if (!provider) {
    const type = (process.env.LLM_PROVIDER as ProviderType) ?? DEFAULT_LLM_PROVIDER;
    console.log(`[LLM] Initializing provider: ${type}`);
    provider = createProvider(type);
  }
  return provider;
}

/**
 * Build the provider-specific config from the system instruction.
 */
function buildConfig(system: string, options?: { disableSchema?: boolean }): ProviderConfig {
  const type = (process.env.LLM_PROVIDER as ProviderType) ?? DEFAULT_LLM_PROVIDER;
  const model = process.env.LLM_MODEL || PROVIDER_MODELS[type] || LLM_CONFIG.MODEL;

  switch (type) {
    case "gemini":
      return buildGeminiConfig(model, system, LLM_CONFIG.MAX_OUTPUT_TOKENS, options);
    case "groq":
      return buildGroqConfig(model, system, LLM_CONFIG.MAX_OUTPUT_TOKENS, options);
    case "openai":
      return buildOpenAIConfig(model, system, LLM_CONFIG.MAX_OUTPUT_TOKENS, options);
    default:
      return buildGeminiConfig(model, system, LLM_CONFIG.MAX_OUTPUT_TOKENS, options);
  }
}

// ---------------------------------------------------------------------------
// Main call function — same signature as before for backward compatibility
// ---------------------------------------------------------------------------

/**
 * Call the configured LLM with the given system instruction and user prompt.
 * Configurable via LLM_PROVIDER env var.
 *
 * @param system - System instruction / context prompt.
 * @param user - User prompt (game state + strategic context).
 * @returns JSON string response from the LLM.
 */
export async function callLLM(
  system: string,
  user: string,
  options?: { disableSchema?: boolean }
): Promise<string> {
  validateEnv();
  const activeProvider = getProvider();
  const config = buildConfig(system, options);
  return await callProviderWithRetry(activeProvider, user, config);
}

/**
 * Reset the provider instance (useful for testing).
 */
export function resetProvider(): void {
  provider = null;
}

export { validateEnv };
