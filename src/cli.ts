import type { ParsedCommand, Recency, StatusInfo } from "./types.js";
import { EXIT_SUCCESS, EXIT_FAILURE, EXIT_AUTH_SETUP, EXIT_USAGE } from "./types.js";
import { formatStatusOutput } from "./commands/status.js";
import { runLogin } from "./commands/login.js";
import { runLogout } from "./commands/logout.js";
import { runSearch } from "./commands/search.js";
import { createPrompts } from "./auth/prompts.js";
import { authenticate } from "./auth/login.js";
import { loadToken, clearToken } from "./auth/storage.js";
import { resolveUpstreamPath, resolveUpstreamModules, saveUpstreamConfig } from "./upstream/resolve.js";
import { loadUpstreamAdapter } from "./upstream/adapter.js";
import { UpstreamError } from "./upstream/contracts.js";

const VALID_RECENCY = new Set<string>(["hour", "day", "week", "month", "year"]);
const KNOWN_COMMANDS = new Set(["search", "login", "logout", "status"]);

function error(message: string): ParsedCommand {
  return { command: "error", message, exitCode: EXIT_USAGE };
}

function consumeValue(args: string[], i: number, flag: string): [string, number] | null {
  if (i + 1 >= args.length) return null;
  return [args[i + 1], i + 1];
}

function parseSearch(args: string[]): ParsedCommand {
  let query: string | undefined;
  let recency: Recency | undefined;
  let limit: number | undefined;
  let format: "text" | "json" = "text";
  let upstream: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--query") {
      const val = consumeValue(args, i, arg);
      if (!val) return error("--query requires a value");
      query = val[0];
      i = val[1];
    } else if (arg === "--recency") {
      const val = consumeValue(args, i, arg);
      if (!val) return error("--recency requires a value");
      if (!VALID_RECENCY.has(val[0])) {
        return error(`Invalid --recency value: ${val[0]}. Must be one of: hour, day, week, month, year`);
      }
      recency = val[0] as Recency;
      i = val[1];
    } else if (arg === "--limit") {
      const val = consumeValue(args, i, arg);
      if (!val) return error("--limit requires a value");
      const n = Number(val[0]);
      if (!Number.isFinite(n) || n < 1 || n !== Math.floor(n)) {
        return error(`Invalid --limit value: ${val[0]}. Must be a positive integer`);
      }
      limit = n;
      i = val[1];
    } else if (arg === "--json") {
      format = "json";
    } else if (arg === "--upstream") {
      const val = consumeValue(args, i, arg);
      if (!val) return error("--upstream requires a value");
      upstream = val[0];
      i = val[1];
    } else {
      return error(`Unknown flag: ${arg}`);
    }
  }

  if (!query) {
    return error("search requires --query <text>");
  }

  return { command: "search", query, recency, limit, format, upstream };
}

function parseLogin(args: string[]): ParsedCommand {
  let force = false;
  let upstream: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--help" || arg === "-h") {
      return { command: "help" };
    } else if (arg === "--force") {
      force = true;
    } else if (arg === "--upstream") {
      const val = consumeValue(args, i, arg);
      if (!val) return error("--upstream requires a value");
      upstream = val[0];
      i = val[1];
    } else {
      return error(`Unknown flag for login: ${arg}`);
    }
  }

  return { command: "login", force, upstream };
}

function parseLogout(args: string[]): ParsedCommand {
  let upstream: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--upstream") {
      const val = consumeValue(args, i, arg);
      if (!val) return error("--upstream requires a value");
      upstream = val[0];
      i = val[1];
    } else {
      return error(`Unknown flag for logout: ${arg}`);
    }
  }

  return { command: "logout", upstream };
}

function parseStatus(args: string[]): ParsedCommand {
  let upstream: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--upstream") {
      const val = consumeValue(args, i, arg);
      if (!val) return error("--upstream requires a value");
      upstream = val[0];
      i = val[1];
    } else {
      return error(`Unknown flag for status: ${arg}`);
    }
  }

  return { command: "status", upstream };
}

export function parseCli(argv: string[]): ParsedCommand {
  if (argv.length === 0 || argv[0] === "--help" || argv[0] === "-h") {
    return { command: "help" };
  }

  const cmd = argv[0];
  const rest = argv.slice(1);

  if (!KNOWN_COMMANDS.has(cmd)) {
    return error(`Unknown command: ${cmd}. Available commands: search, login, logout, status`);
  }

  switch (cmd) {
    case "search":
      return parseSearch(rest);
    case "login":
      return parseLogin(rest);
    case "logout":
      return parseLogout(rest);
    case "status":
      return parseStatus(rest);
    default:
      return error(`Unknown command: ${cmd}`);
  }
}

export function helpText(): string {
  return `Usage: pplx-wrapper <command> [options]

Commands:
  search    Run a Perplexity web search
  login     Authenticate and cache credentials
  logout    Clear cached credentials
  status    Print readiness diagnostics

Search options:
  --query <text>           Search query (required)
  --recency <period>       Filter by age: hour, day, week, month, year
  --limit <N>              Max sources to include (1-50)
  --json                   Output JSON instead of text
  --upstream <path>        Path to upstream pi-perplexity checkout

Login options:
  --force                  Clear cached token before login
  --upstream <path>        Path to upstream pi-perplexity checkout

Logout options:
  --upstream <path>        Path to upstream pi-perplexity checkout

Status options:
  --upstream <path>        Path to upstream pi-perplexity checkout

Environment variables:
  PI_PERPLEXITY_UPSTREAM_DIR   Default upstream checkout path
  PI_AUTH_NO_BORROW=1          Skip macOS desktop app extraction
  PI_PERPLEXITY_EMAIL          Pre-fill email for OTP login
  PI_PERPLEXITY_OTP            Pre-fill OTP code

Upstream resolution (in order):
  1. --upstream flag
  2. PI_PERPLEXITY_UPSTREAM_DIR env var
  3. Saved config (~/.config/pplx-wrapper/config.json)
  4. Auto-discover from common locations (sibling dirs, ~/Code, C:\\Code, etc.)

  Tip: run "pplx-wrapper status --upstream /path" once to save the path permanently.

Exit codes:
  0   Success
  1   Runtime failure (network, API, stream error)
  2   Auth/setup issue (missing upstream, token, non-interactive)
  64  Invalid CLI usage (unknown command, missing flags)`;
}

function checkBun(): "available" | "missing" {
  try {
    if (typeof Bun !== "undefined") return "available";
    return "missing";
  } catch {
    return "missing";
  }
}

function checkInteractive(): "yes" | "no" {
  try {
    return process.stdin.isTTY ? "yes" : "no";
  } catch {
    return "no";
  }
}

async function checkToken(): Promise<"present" | "missing"> {
  try {
    const token = await loadToken();
    return token ? "present" : "missing";
  } catch {
    return "missing";
  }
}

async function checkUpstreamReadiness(cliUpstream: string | undefined): Promise<{ status: "ready" | "missing"; error?: string }> {
  try {
    const upstreamPath = resolveUpstreamPath(cliUpstream);
    await resolveUpstreamModules({ root: upstreamPath });
    return { status: "ready" };
  } catch (e) {
    if (e instanceof UpstreamError) {
      const hasExplicitPath = cliUpstream !== undefined || process.env["PI_PERPLEXITY_UPSTREAM_DIR"] !== undefined;
      if (hasExplicitPath) {
        return { status: "missing", error: e.message };
      }
      return { status: "missing" };
    }
    throw e;
  }
}

async function runStatus(upstream: string | undefined): Promise<number> {
  const upstreamCheck = await checkUpstreamReadiness(upstream);

  if (upstreamCheck.error) {
    process.stderr.write(upstreamCheck.error + "\n");
    return EXIT_AUTH_SETUP;
  }

  // If upstream was explicitly provided and valid, save for future auto-resolve
  if (upstream && upstreamCheck.status === "ready") {
    try {
      saveUpstreamConfig(upstream);
    } catch {
      // non-fatal
    }
  }

  const info: StatusInfo = {
    bun: checkBun(),
    upstream: upstreamCheck.status,
    token: await checkToken(),
    interactive: checkInteractive(),
  };

  process.stdout.write(formatStatusOutput(info) + "\n");

  if (info.bun === "missing" || info.upstream === "missing" || info.token === "missing") {
    return EXIT_AUTH_SETUP;
  }
  return EXIT_SUCCESS;
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const parsed = parseCli(argv);

  switch (parsed.command) {
    case "help": {
      process.stdout.write(helpText() + "\n");
      process.exit(EXIT_SUCCESS);
      break;
    }
    case "error": {
      process.stderr.write(parsed.message + "\n");
      process.exit(parsed.exitCode);
      break;
    }
    case "status": {
      const code = await runStatus(parsed.upstream);
      process.exit(code);
      break;
    }
    case "search": {
      const code = await runSearch(parsed, {
        write: (t) => process.stdout.write(t),
        writeError: (t) => process.stderr.write(t),
        loadAdapter: async (upstreamPath?: string) => {
          const resolved = resolveUpstreamPath(upstreamPath);
          return loadUpstreamAdapter(resolved);
        },
        loadToken,
        clearToken,
      });
      process.exit(code);
      break;
    }
    case "login": {
      const isInteractive = checkInteractive() === "yes";
      const prompts = createPrompts(isInteractive);
      const code = await runLogin(parsed, {
        stdout: (t) => process.stdout.write(t),
        stderr: (t) => process.stderr.write(t),
        isInteractive: () => isInteractive,
        authenticate: async () => {
          const emailFn = prompts.promptForEmail;
          const otpFn = prompts.promptForOtp;
          const authOpts: Parameters<typeof authenticate>[0] = {};
          if (emailFn) authOpts.promptForEmail = emailFn;
          if (otpFn) authOpts.promptForOtp = async (_email: string) => otpFn();
          const token = await authenticate(authOpts);
          return { type: "oauth", access: token };
        },
        clearToken,
        loadToken,
      });
      process.exit(code);
      break;
    }
    case "logout": {
      const code = await runLogout(parsed, {
        stdout: (t) => process.stdout.write(t),
        stderr: (t) => process.stderr.write(t),
        clearToken,
        loadToken,
      });
      process.exit(code);
      break;
    }
  }
}

if (typeof Bun !== "undefined" && Bun.main === import.meta.path) {
  main().catch((err) => {
    process.stderr.write(`Fatal: ${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(EXIT_FAILURE);
  });
}
