import * as path from "node:path";
import * as fs from "node:fs";
import type { UpstreamModulePaths } from "./contracts.js";
import { UpstreamError } from "./contracts.js";

const REQUIRED_FILES = [
  "src/auth/login.ts",
  "src/search/client.ts",
  "src/search/format.ts",
  "package.json",
] as const;

export function resolveUpstreamPath(cliUpstream?: string): string {
  const resolved = cliUpstream ?? process.env["PI_PERPLEXITY_UPSTREAM_DIR"];
  if (!resolved) {
    throw new UpstreamError(
      "No upstream path configured. Use --upstream <path> or set PI_PERPLEXITY_UPSTREAM_DIR.",
    );
  }
  return resolved;
}

export async function resolveUpstreamModules(opts: { root: string }): Promise<UpstreamModulePaths> {
  const root = path.resolve(opts.root);

  const missing: string[] = [];
  for (const file of REQUIRED_FILES) {
    const full = path.join(root, file);
    if (!fs.existsSync(full)) {
      missing.push(file);
    }
  }

  if (missing.length > 0) {
    throw new UpstreamError(
      `missing upstream file: ${missing.join(", ")} (checked in ${root})`,
    );
  }

  return {
    auth: path.join(root, "src/auth/login.ts"),
    search: path.join(root, "src/search/client.ts"),
    format: path.join(root, "src/search/format.ts"),
  };
}
