import { env } from "@/lib/env.server";
import type { LogicalModelId } from "./types";

/**
 * Provider model IDs — overridable via environment so ThunderGPT can track
 * Gemini / xAI model changes without a code rewrite.
 *
 * Defaults use currently recommended IDs (late 2026):
 * Gemini 3.8 Flash, 3.1 Pro, 3.1 Flash Image; xAI grok-4.5 + Imagine.
 */
export function geminiModelMap(): Record<Exclude<LogicalModelId, "auto">, string> {
  return {
    fast: env("GEMINI_MODEL_FAST") ?? "gemini-3.8-flash",
    general: env("GEMINI_MODEL_GENERAL") ?? "gemini-3.8-flash",
    reasoning: env("GEMINI_MODEL_REASONING") ?? "gemini-3.1-pro-preview",
    vision: env("GEMINI_MODEL_VISION") ?? "gemini-3.8-flash",
    image: env("GEMINI_MODEL_IMAGE") ?? "gemini-3.1-flash-image",
  };
}

export function xaiModelMap(): Record<Exclude<LogicalModelId, "auto">, string> {
  return {
    fast: env("XAI_MODEL_FAST") ?? "grok-4.5",
    general: env("XAI_MODEL_GENERAL") ?? "grok-4.5",
    reasoning: env("XAI_MODEL_REASONING") ?? "grok-4.5",
    vision: env("XAI_MODEL_VISION") ?? "grok-4.5",
    image: env("XAI_MODEL_IMAGE") ?? "grok-imagine-image-quality",
  };
}
