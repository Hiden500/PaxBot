/**
 * Brain: LLM Provider Interface
 *
 * Abstract interface for LLM providers (Gemini, Groq, OpenAI, etc.).
 * Each provider implementation must implement this interface.
 */

import type { Type } from "@google/genai";

/**
 * Schema definition for structured JSON output.
 * Mirrors the structure needed for Gemini's responseSchema.
 */
export interface ResponseSchema {
  type: typeof Type.OBJECT | "object" | "array" | "string" | "number" | "boolean";
  properties?: Record<string, unknown>;
  items?: Record<string, unknown>;
  required?: string[];
  description?: string;
}

/**
 * Configuration for a provider call.
 */
export interface ProviderConfig {
  model: string;
  systemInstruction?: string;
  responseMimeType?: string;
  responseSchema?: Record<string, unknown>;
  maxOutputTokens?: number;
}

/**
 * LLM Provider interface.
 */
export interface LLMProvider {
  /** Unique provider name (e.g. "gemini", "groq", "openai"). */
  readonly name: string;

  /**
   * Generate content from the LLM.
   * @param prompt - The user prompt.
   * @param config - Configuration for the call.
   * @returns The generated text response.
   */
  generate(prompt: string, config: ProviderConfig): Promise<string>;
}
