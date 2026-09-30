type LogPayload = {
  event: string;
  category?: string;
  model?: string;
  latencyMs?: number;
  ok?: boolean;
  provider?: string;
};

export function logAi(payload: LogPayload): void {
  const line = {
    ts: new Date().toISOString(),
    ...payload,
  };
  if (payload.ok === false) {
    console.error("[thundergpt]", JSON.stringify(line));
    return;
  }
  console.info("[thundergpt]", JSON.stringify(line));
}
