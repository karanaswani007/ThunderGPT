import type { LogicalModelId, ModelCapability } from "./types";

export type ModelCatalogEntry = {
  id: LogicalModelId;
  label: string;
  description: string;
  capabilities: ModelCapability[];
};

/**
 * Logical ThunderGPT models. Provider-specific IDs live in env/config
 * (`src/lib/ai/model-config.ts`) so Gemini/xAI model strings can change
 * without touching the rest of the app.
 */
export const MODEL_CATALOG: readonly ModelCatalogEntry[] = [
  {
    id: "auto",
    label: "Auto",
    description: "Picks the right ThunderGPT model for the task",
    capabilities: ["chat", "code", "vision", "documents", "search", "reasoning"],
  },
  {
    id: "fast",
    label: "Thunder Fast",
    description: "Snappy replies for everyday questions",
    capabilities: ["chat", "vision", "documents", "search"],
  },
  {
    id: "general",
    label: "Thunder",
    description: "Balanced quality for writing, planning, and analysis",
    capabilities: ["chat", "code", "vision", "documents", "search"],
  },
  {
    id: "reasoning",
    label: "Thunder Pro",
    description: "Deeper reasoning for code, math, and hard problems",
    capabilities: ["chat", "code", "reasoning", "documents", "search"],
  },
  {
    id: "vision",
    label: "Thunder Vision",
    description: "Understands images, screenshots, and visual documents",
    capabilities: ["chat", "vision", "documents"],
  },
  {
    id: "image",
    label: "Thunder Image",
    description: "Generate and edit images from a prompt",
    capabilities: ["image"],
  },
] as const;

export const LOGICAL_MODEL_IDS: readonly LogicalModelId[] = MODEL_CATALOG.map(
  (m) => m.id,
);

export function isLogicalModelId(value: string): value is LogicalModelId {
  return (LOGICAL_MODEL_IDS as readonly string[]).includes(value);
}
