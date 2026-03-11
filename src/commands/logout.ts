import type { LogoutCommand } from "../types.js";
import type { StoredToken } from "../search/types.js";
import { EXIT_SUCCESS } from "../types.js";

export interface LogoutDeps {
  stdout: (text: string) => void;
  stderr: (text: string) => void;
  clearToken: () => Promise<void>;
  loadToken: () => Promise<StoredToken | null>;
}

export async function runLogout(cmd: LogoutCommand, deps: LogoutDeps): Promise<number> {
  const existing = await deps.loadToken();
  await deps.clearToken();

  if (existing) {
    deps.stdout("logged out\n");
  } else {
    deps.stdout("token already absent\n");
  }

  return EXIT_SUCCESS;
}
