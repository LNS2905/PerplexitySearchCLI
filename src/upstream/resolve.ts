import * as path from "node:path";
import * as fs from "node:fs";
import { homedir } from "node:os";
import { execSync } from "node:child_process";
import type { UpstreamModulePaths } from "./contracts.js";
import { UpstreamError } from "./contracts.js";

const UPSTREAM_PACKAGE_NAME = "pi-perplexity";

const REQUIRED_FILES = [
  "src/auth/login.ts",
  "src/search/client.ts",
  "src/search/format.ts",
  "package.json",
] as const;

const CONFIG_PATH = path.join(homedir(), ".config", "pplx-wrapper", "config.json");

// ─── Validation ──────────────────────────────────────────────────────────────

/** Check required files exist AND package.json has the right name. */
function isValidUpstream(dir: string): boolean {
  if (!REQUIRED_FILES.every((file) => fs.existsSync(path.join(dir, file)))) {
    return false;
  }
  // Verify package identity — don't accept random repos with similar file layouts
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8"));
    return pkg.name === UPSTREAM_PACKAGE_NAME;
  } catch {
    return false;
  }
}

// ─── Config persistence ──────────────────────────────────────────────────────

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

// ─── Discovery strategies (no hardcoded paths) ──────────────────────────────

/**
 * Strategy 1: Walk up from a starting directory, checking siblings at each level.
 *
 * Starting from e.g. C:\Code\PerplexitySearchCLI:
 *   Level 0: check C:\Code\* for any sibling named pi-perplexity (or with matching package.json)
 *   Level 1: check C:\* siblings
 *   ...stops at filesystem root or after maxLevels.
 *
 * This works regardless of where the user clones repos — no path guessing needed.
 */
function walkUpAndScanSiblings(startDir: string, maxLevels = 4): string | null {
  let current = path.resolve(startDir);

  for (let level = 0; level < maxLevels; level++) {
    const parent = path.dirname(current);
    if (parent === current) break; // reached filesystem root

    // Scan all immediate children of parent
    try {
      const entries = fs.readdirSync(parent, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const candidate = path.join(parent, entry.name);
        if (candidate === path.resolve(startDir) && level === 0) continue; // skip self
        if (isValidUpstream(candidate)) {
          return candidate;
        }
      }
    } catch {
      // permission denied or unreadable — skip this level
    }

    current = parent;
  }

  return null;
}

/**
 * Strategy 2: Check Bun's global link registry.
 *
 * When a user runs `bun link` in pi-perplexity, Bun records it in its global install dir.
 * We can resolve the real path from there.
 */
function checkBunGlobalLink(): string | null {
  try {
    const bunInstallDir = path.join(homedir(), ".bun", "install", "global", "node_modules", UPSTREAM_PACKAGE_NAME);
    if (fs.existsSync(bunInstallDir)) {
      // Resolve symlink to actual source directory
      const realPath = fs.realpathSync(bunInstallDir);
      if (isValidUpstream(realPath)) {
        return realPath;
      }
    }
  } catch {
    // bun not installed or no global link
  }
  return null;
}

/**
 * Strategy 3: Use npm/bun to resolve the package globally.
 *
 * Tries `npm root -g` and checks if pi-perplexity is installed there.
 */
function checkNpmGlobal(): string | null {
  try {
    const globalRoot = execSync("npm root -g", { encoding: "utf8", timeout: 5000 }).trim();
    const candidate = path.join(globalRoot, UPSTREAM_PACKAGE_NAME);
    if (fs.existsSync(candidate)) {
      const realPath = fs.realpathSync(candidate);
      if (isValidUpstream(realPath)) {
        return realPath;
      }
    }
  } catch {
    // npm not installed or failed
  }
  return null;
}

/**
 * Strategy 4: Scan home directory's immediate children for code-like folders,
 * then check inside them. Dynamically discovers ~/Code, ~/Projects, ~/dev, etc.
 * without hardcoding any path names.
 */
function scanHomeCodeDirs(): string | null {
  const home = homedir();

  try {
    const entries = fs.readdirSync(home, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      // Skip hidden dirs, system dirs, and known non-code dirs
      if (entry.name.startsWith(".") || entry.name.startsWith("$")) continue;

      const subDir = path.join(home, entry.name);

      // Check if pi-perplexity is directly inside this dir
      const candidate = path.join(subDir, UPSTREAM_PACKAGE_NAME);
      if (isValidUpstream(candidate)) {
        return candidate;
      }
    }
  } catch {
    // permission denied
  }

  return null;
}

/**
 * Run all discovery strategies in order of reliability.
 * Returns the first valid upstream path found, or null.
 */
function autoDiscoverUpstream(): string | null {
  // Strategy 1a: Walk up from wrapper installation directory
  const wrapperRoot = path.resolve(import.meta.dir, "../..");
  const fromWrapper = walkUpAndScanSiblings(wrapperRoot);
  if (fromWrapper) return fromWrapper;

  // Strategy 1b: Walk up from current working directory (may differ from wrapper location)
  const cwd = process.cwd();
  if (path.resolve(cwd) !== path.resolve(wrapperRoot)) {
    const fromCwd = walkUpAndScanSiblings(cwd);
    if (fromCwd) return fromCwd;
  }

  // Strategy 2: Bun global link registry
  const fromBunLink = checkBunGlobalLink();
  if (fromBunLink) return fromBunLink;

  // Strategy 3: npm global packages
  const fromNpmGlobal = checkNpmGlobal();
  if (fromNpmGlobal) return fromNpmGlobal;

  // Strategy 4: Scan ~/*/pi-perplexity
  const fromHome = scanHomeCodeDirs();
  if (fromHome) return fromHome;

  return null;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Resolve the upstream path with this precedence:
 * 1. CLI --upstream flag
 * 2. PI_PERPLEXITY_UPSTREAM_DIR env var
 * 3. Saved config at ~/.config/pplx-wrapper/config.json
 * 4. Auto-discover (walk-up sibling scan, bun link, npm global, home scan)
 *
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

  // 3. Saved config (re-validate in case the checkout was moved/deleted)
  const savedPath = loadSavedConfig();
  if (savedPath && isValidUpstream(savedPath)) {
    return savedPath;
  }

  // 4. Auto-discover
  const discovered = autoDiscoverUpstream();
  if (discovered) {
    // Cache for next time so discovery only runs once
    try {
      saveUpstreamConfig(discovered);
    } catch {
      // non-fatal — we found it, just can't cache
    }
    return discovered;
  }

  throw new UpstreamError(
    "No upstream path configured and auto-discovery failed.\n" +
    "  How to fix (pick one):\n" +
    "    1. Clone pi-perplexity next to this wrapper:  git clone https://github.com/user/pi-perplexity.git\n" +
    "    2. Point to existing checkout:  pplx-wrapper status --upstream /your/path/to/pi-perplexity\n" +
    "    3. Set env var:  export PI_PERPLEXITY_UPSTREAM_DIR=/your/path/to/pi-perplexity\n" +
    "    4. Bun-link it:  cd /your/pi-perplexity && bun link",
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
