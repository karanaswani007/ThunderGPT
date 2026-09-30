import { env } from "../env.server";

export const PREVIEW_CLIENT_ID = env("GROK_PREVIEW_CLIENT_ID");
export const PREVIEW_CLIENT_SECRET = env("GROK_PREVIEW_CLIENT_SECRET");
export const GROK_ISSUER_DEFAULT = env("GROK_PREVIEW_AUTH_ISSUER");
export const PREVIEW_ALLOWED_HOSTS = (env("GROK_PREVIEW_ALLOWED_HOSTS") ?? "")
  .split(",")
  .map((host) => host.trim())
  .filter(Boolean);
