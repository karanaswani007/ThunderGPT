import { PRODUCT } from "@/lib/product";
import { ThunderError } from "./errors";
import { buildSystemPrompt, type IdentityContext } from "./identity";
import { geminiProvider } from "./providers/gemini";
import { xaiProvider } from "./providers/xai";
import type { AIProvider, ProviderHealth } from "./types";

/**
 * Provider order: Gemini is the intended primary engine (GEMINI_API_KEY).
 * xAI is used when Gemini is not configured so ThunderGPT still runs.
 */
export function listProviders(): ProviderHealth[] {
  return [geminiProvider, xaiProvider].map((p) => ({
    id: p.id,
    label: p.label,
    available: p.isAvailable(),
    supportsImage: p.isAvailable(),
    supportsSearch: p.isAvailable(),
  }));
}

export function getActiveProvider(): AIProvider {
  if (geminiProvider.isAvailable()) return geminiProvider;
  if (xaiProvider.isAvailable()) return xaiProvider;
  throw new ThunderError(
    "ThunderGPT’s AI engine is not configured yet. Add a Gemini API key to enable chat.",
    { status: 503, category: "config" },
  );
}

export function identityFor(provider: AIProvider): IdentityContext {
  if (provider.id === "gemini") {
    return { engineLabel: "Google Gemini", engineVendor: "Google" };
  }
  return { engineLabel: "xAI Grok", engineVendor: "xAI" };
}

export function systemPromptFor(provider: AIProvider): string {
  return buildSystemPrompt(identityFor(provider));
}

export function engineBlurb(provider: AIProvider): string {
  const id = identityFor(provider);
  return `${PRODUCT.name} is an AI assistant developed by ${PRODUCT.company} and powered by ${id.engineLabel}.`;
}
