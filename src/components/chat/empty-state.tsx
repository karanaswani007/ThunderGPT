import { FileText, Globe, Image as ImageIcon, Sparkles } from "lucide-react";
import { Wordmark } from "@/components/brand/logo";
import { PRODUCT } from "@/lib/product";

const SUGGESTIONS = [
  {
    icon: Sparkles,
    title: "Plan a product launch",
    prompt: "Help me plan a 4-week launch for a new AI SaaS product. Include milestones, risks, and a launch-week checklist.",
  },
  {
    icon: FileText,
    title: "Explain a document",
    prompt: "I'll attach a document next. Summarize it in plain language and list the key decisions.",
  },
  {
    icon: Globe,
    title: "Research with sources",
    prompt: "What are the most important web framework trends this year? Cite sources.",
  },
  {
    icon: ImageIcon,
    title: "Generate a visual",
    prompt: "Create a cinematic still of a lightning bolt cutting through a navy sky over a quiet city.",
  },
];

export function EmptyState({ onPrompt }: { onPrompt: (text: string) => void }) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-4 py-10">
      <Wordmark />
      <p className="mt-4 max-w-md text-center text-sm text-muted-foreground">
        {PRODUCT.tagline}. Ask anything, attach a file, or generate an image.
      </p>
      <div className="mt-8 grid w-full gap-2 sm:grid-cols-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s.title}
            type="button"
            onClick={() => onPrompt(s.prompt)}
            className="rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/40 hover:bg-muted"
          >
            <s.icon className="mb-3 size-4 text-primary" />
            <div className="text-sm font-medium">{s.title}</div>
            <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{s.prompt}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
