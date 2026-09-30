import { MODEL_CATALOG } from "@/lib/ai/models";
import type { LogicalModelId } from "@/lib/ai/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";

export function ModelSelector({
  value,
  onChange,
}: {
  value: LogicalModelId;
  onChange: (id: LogicalModelId) => void;
}) {
  const current = MODEL_CATALOG.find((m) => m.id === value) ?? MODEL_CATALOG[0];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex h-9 items-center gap-1 rounded-full border border-border bg-card px-3 text-xs font-medium hover:bg-muted"
        >
          {current.label}
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        {MODEL_CATALOG.map((m) => (
          <DropdownMenuItem
            key={m.id}
            onSelect={() => onChange(m.id)}
            className="flex-col items-start gap-0.5"
          >
            <span className="font-medium">{m.label}</span>
            <span className="text-xs text-muted-foreground">{m.description}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
