import { cn } from "@/lib/utils";

export function BoltMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 64"
      className={cn("shrink-0", className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="tg-bolt" x1="10" y1="0" x2="40" y2="64">
          <stop offset="0%" stopColor="#5EC8FF" />
          <stop offset="100%" stopColor="#1A6DFF" />
        </linearGradient>
      </defs>
      <path
        fill="url(#tg-bolt)"
        d="M30.2 1.2 6.4 32.6c-.6.8 0 1.9 1 1.9h16.2L14.4 62.4c-.5 1.1.9 2 1.8 1.2L42.6 30.6c.7-.8 0-2-1.1-2H24.6L32 2.4c.4-1.1-1-2-1.8-1.2Z"
      />
    </svg>
  );
}

export function Wordmark({
  className,
  compact,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <BoltMark className="h-8 w-6" />
      <div className="leading-none">
        <div className="font-display text-[1.2rem] font-semibold tracking-tight">
          Thunder<span className="text-primary">GPT</span>
        </div>
        {!compact ? (
          <div className="mt-1 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            HK SoftTech
          </div>
        ) : null}
      </div>
    </div>
  );
}
