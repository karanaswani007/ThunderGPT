#!/usr/bin/env node
import { copyFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

if (!process.env.DATABASE_URL?.trim()) {
  const sourceDir = join(root, "node_modules", "@electric-sql", "pglite", "dist");
  const outputDir = join(root, ".vercel", "output", "functions", "__server.func", "_libs");
  const assets = ["pglite.data", "pglite.wasm", "initdb.wasm"];

  if (!existsSync(outputDir)) {
    throw new Error(`Nitro server bundle not found at ${outputDir}`);
  }

  for (const asset of assets) {
    const source = join(sourceDir, asset);
    if (!existsSync(source)) throw new Error(`PGLite runtime asset not found: ${source}`);
    copyFileSync(source, join(outputDir, asset));
  }

  console.log("[pglite] copied local fallback runtime assets into the Vercel function.");
}