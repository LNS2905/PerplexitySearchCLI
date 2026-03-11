import type { LoginCommand } from "../types.js";
import type { StoredToken } from "../search/types.js";
import { EXIT_SUCCESS, EXIT_FAILURE, EXIT_AUTH_SETUP } from "../types.js";
import { getAuthMode } from "../auth/service.js";

export interface LoginDeps {
  stdout: (text: string) => void;
  stderr: (text: string) => void;
  isInteractive: () => boolean;
  authenticate: (options: { promptForEmail?: () => Promise<string>; promptForOtp?: () => Promise<string> }) => Promise<{ type: "oauth"; access: string }>;
  clearToken: () => Promise<void>;
  loadToken: () => Promise<StoredToken | null>;
  envEmail?: string | undefined;
  borrowDisabled?: boolean | undefined;
  platform?: string | undefined;
}

export async function runLogin(cmd: LoginCommand, deps: LoginDeps): Promise<number> {
  if (cmd.force) {
    await deps.clearToken();
  }

  const cached = await deps.loadToken();
  const mode = await getAuthMode({
    hasStoredToken: !cmd.force && cached !== null,
    isInteractive: deps.isInteractive(),
    platform: deps.platform ?? process.platform,
    borrowDisabled: deps.borrowDisabled ?? process.env.PI_AUTH_NO_BORROW === "1",
    hasEnvEmail: (deps.envEmail ?? process.env.PI_PERPLEXITY_EMAIL) !== undefined,
  });

  if (mode === "setup-error") {
    deps.stderr("Cannot login in non-interactive mode without cached token or PI_PERPLEXITY_EMAIL.\n");
    return EXIT_AUTH_SETUP;
  }

  try {
    await deps.authenticate({});
    deps.stdout("logged in\n");
    return EXIT_SUCCESS;
  } catch (e) {
    deps.stderr(`Login failed: ${e instanceof Error ? e.message : String(e)}\n`);
    return EXIT_FAILURE;
  }
}
