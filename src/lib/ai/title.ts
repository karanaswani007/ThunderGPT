import { getActiveProvider } from "./provider";
import { selectLogicalModel } from "./select-model";

export async function generateTitle(userText: string): Promise<string> {
  const snippet = userText.replace(/\s+/g, " ").trim().slice(0, 280);
  if (!snippet) return "New chat";
  try {
    const provider = getActiveProvider();
    const modelId = provider.resolveModel(selectLogicalModel({ preferred: "fast" }));
    let out = "";
    for await (const ev of provider.streamText({
      modelId,
      system:
        "Generate a concise 3–6 word title for this chat. No quotes, no punctuation at the end, no emoji. Title case.",
      messages: [{ role: "user", content: snippet }],
      maxTokens: 24,
    })) {
      if (ev.type === "delta") out += ev.text;
    }
    const title = out.replace(/["'\n]/g, "").trim().slice(0, 60);
    return title || fallbackTitle(snippet);
  } catch {
    return fallbackTitle(snippet);
  }
}

function fallbackTitle(text: string): string {
  const words = text.split(/\s+/).slice(0, 6).join(" ");
  return words.length > 48 ? `${words.slice(0, 45)}…` : words || "New chat";
}
