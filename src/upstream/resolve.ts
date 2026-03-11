import * as path from "node:path";
import * as fs from "node:fs";
import { homedir } from "node:os";
import type { UpstreamModulePaths } from "./contracts.js";
import { UpstreamError } from "./contracts.js";

const REQUIRED_FILES = [
  "src/auth/login.ts",
  "src/search/client.ts",
  "src/search/format.ts",
  "package.json",
] as const;

const CONFIG_PATH = path.join(homedir(), ".config", "pplx-wrapper", "config.json");

/** Check if a directory looks like a valid pi-perplexity upstream checkout. */
function isValidUpstream(dir: string): boolean {
  return REQUIRED_FILES.every((file) => fs.existsSync(path.join(dir, file)));
}

/** Load saved upstream path from ~/.config/pplx-wrapper/config.json */
function loadSavedConfig(): string | null {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, "utf8");
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (typeof parsed.upstreamDir === "string" && parsed.upstreamDir.length > 0) {
      return parsed.upstreamDir;
    }
  } catch {
    // no config file or invalid — fine, skip
  }
  return null;
}

/** Save upstream path to ~/.config/pplx-wrapper/config.json for future auto-resolve. */
export function saveUpstreamConfig(upstreamDir: string): void {
  const dir = path.dirname(CONFIG_PATH);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify({ upstreamDir }, null, 2) + "\n", "utf8");
}

/**
 * Auto-discover pi-perplexity checkout by scanning common locations.
 * Checks sibling directories, common code directories, and home subdirectories.
 */
function autoDiscoverUpstream(): string | null {
  const candidates: string[] = [];

  // 1. Sibling of this wrapper repo (e.g., C:\Code\pi-perplexity next to C:\Code\PerplexitySearchCLI)
  const wrapperRoot = path.resolve(import.meta.dir, "../..");
  const parentOfWrapper = path.dirname(wrapperRoot);
  candidates.push(path.join(parentOfWrapper, "pi-perplexity"));

  // 2. Common code directories on Windows and Unix
  const home = homedir();
  candidates.push(
    path.join(home, "Code", "pi-perplexity"),
    path.join(home, "code", "pi-perplexity"),
    path.join(home, "Projects", "pi-perplexity"),
    path.join(home, "projects", "pi-perplexity"),
    path.join(home, "src", "pi-perplexity"),
    path.join(home, "dev", "pi-perplexity"),
    path.join(home, "repos", "pi-perplexity"),
  );

  // 3. Windows-specific common paths
  if (process.platform === "win32") {
    candidates.push(
      "C:\\Code\\pi-perplexity",
      "D:\\Code\\pi-perplexity",
      "C:\\Projects\\pi-perplexity",
      "C:\\dev\\pi-perplexity",
    );
  }

  // 4. Unix-specific
  if (process.platform !== "win32") {
    candidates.push(
      "/opt/pi-perplexity",
      path.join(home, ".local", "share", "pi-perplexity"),
    );
  }

  // Deduplicate by resolved path
  const seen = new Set<string>();
  for (const candidate of candidates) {
    const resolved = path.resolve(candidate);
    if (seen.has(resolved)) continue;
    seen.add(resolved);

    if (isValidUpstream(resolved)) {
      return resolved;
    }
  }

  return null;
}

/**
 * Resolve the upstream path with this precedence:
 * 1. CLI --upstream flag
 * 2. PI_PERPLEXITY_UPSTREAM_DIR env var
 * 3. Saved config at ~/.config/pplx-wrapper/config.json
 * 4. Auto-discover from common locations
 *
 * When auto-discovered or loaded from config, the path is validated before use.
 * When auto-discovered for the first time, the path is saved to config for future use.
 */
export function resolveUpstreamPath(cliUpstream?: string): string {
  // 1. CLI flag — highest priority
  if (cliUpstream) {
    return cliUpstream;
  }

  // 2. Environment variable
  const envPath = process.env["PI_PERPLEXITY_UPSTREAM_DIR"];
  if (envPath) {
    return envPath;
  }

  // 3. Saved config
  const savedPath = loadSavedConfig();
  if (savedPath && isValidUpstream(savedPath)) {
    return savedPath;
  }

  // 4. Auto-discover
  const discovered = autoDiscoverUpstream();
  if (discovered) {
    // Save for next time so auto-discovery only runs once
    try {
      saveUpstreamConfig(discovered);
    } catch {
      // non-fatal — we found it, just can't cache
    }
    return discovered;
  }

  throw new UpstreamError(
    "No upstream path configured and auto-discovery failed.\n" +
    "  Fix: run one of these:\n" +
    "    pplx-wrapper status --upstream /path/to/pi-perplexity   (saves for future use)\n" +
    "    export PI_PERPLEXITY_UPSTREAM_DIR=/path/to/pi-perplexity\n" +
    "  Or clone pi-perplexity next to this wrapper repo.",
  );
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
