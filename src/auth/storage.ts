import { chmod, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

import type { StoredToken } from "../search/types.js";

const TOKEN_PATH = join(homedir(), ".config", "pi-perplexity", "auth.json");

function isStoredToken(value: unknown): value is StoredToken {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    candidate.type === "oauth" &&
    typeof candidate.access === "string" &&
    candidate.access.length > 0
  );
}

export async function loadToken(): Promise<StoredToken | null> {
  try {
    const raw = await readFile(TOKEN_PATH, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!isStoredToken(parsed)) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export async function saveToken(token: StoredToken): Promise<void> {
  await mkdir(dirname(TOKEN_PATH), { recursive: true });
  await writeFile(TOKEN_PATH, `${JSON.stringify(token, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  await chmod(TOKEN_PATH, 0o600);
}

export async function clearToken(): Promise<void> {
  await rm(TOKEN_PATH, { force: true });
}
