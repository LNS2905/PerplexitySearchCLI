# PerplexitySearchCLI

Standalone CLI wrapper for Perplexity web search. Uses your Perplexity Pro/Max subscription — no API credits consumed. Designed for integration with AI coding agents (OpenCode, Claude Code).

## How It Works

`pplx-wrapper` is a thin CLI that dynamically imports search and auth functionality from a local checkout of the upstream [`pi-perplexity`](https://github.com/ivanrvpereira/pi-perplexity) extension. This architecture keeps the wrapper lightweight while reusing the battle-tested SSE client, token management, and response formatting from upstream.

```
pplx-wrapper (this repo)
    │
    └── dynamically imports at runtime ──► pi-perplexity (local checkout)
                                              ├── src/auth/login.ts
                                              ├── src/search/client.ts
                                              └── src/search/format.ts
```

## Requirements

- **[Bun](https://bun.sh)** ≥ 1.3.9 (runtime — no Node.js support)
- **Local checkout** of [`pi-perplexity`](https://github.com/ivanrvpereira/pi-perplexity) with `bun install` completed

## Install

```bash
git clone https://github.com/LNS2905/PerplexitySearchCLI.git
cd PerplexitySearchCLI
bun install
```

## Setup

### 1. Clone the upstream repository

```bash
git clone https://github.com/ivanrvpereira/pi-perplexity.git
cd pi-perplexity && bun install
```

### 2. Configure the upstream path

Set the environment variable (add to `.bashrc`/`.zshrc`):

```bash
export PI_PERPLEXITY_UPSTREAM_DIR="/absolute/path/to/pi-perplexity"
```

Or pass `--upstream /path/to/pi-perplexity` on every command.

### 3. Authenticate

Run once in an interactive terminal:

```bash
bun run src/cli.ts login
```

This caches your Perplexity JWT at `~/.config/pi-perplexity/auth.json` (mode `0600`).

#### Auth strategies (tried in order)

1. **Cached token** — reuses `~/.config/pi-perplexity/auth.json` if valid
2. **macOS desktop app** — extracts token from the Perplexity desktop app via `defaults read` (skip with `PI_AUTH_NO_BORROW=1`)
3. **Email OTP** — interactive: prompts for email and OTP code; non-interactive: reads `PI_PERPLEXITY_EMAIL` and `PI_PERPLEXITY_OTP` from env

## Usage

### Search

```bash
# Basic search
pplx-wrapper search --query "latest Bun 1.2 features"

# With recency filter and source limit
pplx-wrapper search --query "React 19 release" --recency week --limit 5

# JSON output for programmatic use
pplx-wrapper search --query "TypeScript 5.8 changes" --json

# Explicit upstream path
pplx-wrapper search --query "test" --upstream /path/to/pi-perplexity
```

### Login / Logout / Status

```bash
pplx-wrapper login              # Authenticate and cache token
pplx-wrapper login --force      # Clear cached token, re-authenticate
pplx-wrapper logout             # Remove cached token
pplx-wrapper status             # Print readiness diagnostics
```

## Commands

| Command | Description |
|---------|-------------|
| `search` | Run a Perplexity web search |
| `login` | Authenticate and cache credentials |
| `logout` | Clear cached credentials |
| `status` | Print readiness diagnostics (bun, upstream, token, interactive) |

### Search flags

| Flag | Description |
|------|-------------|
| `--query <text>` | Search query (required) |
| `--recency <period>` | Filter by age: `hour`, `day`, `week`, `month`, `year` |
| `--limit <N>` | Max sources to include (1–50) |
| `--json` | Output JSON instead of text |
| `--upstream <path>` | Override upstream checkout path |

### Login flags

| Flag | Description |
|------|-------------|
| `--force` | Clear cached token before login |
| `--upstream <path>` | Override upstream checkout path |

## Output Format

### Text mode (default)

```
## Answer
<synthesized answer from Perplexity>

## Sources
N sources
[1] Title (2d ago)
    https://url
    snippet preview...

## Meta
Provider: perplexity (oauth)
Model: <display_model>
```

### JSON mode (`--json`)

```json
{
  "answer": "...",
  "sources": [{ "title": "...", "url": "...", "snippet": "...", "date": "..." }],
  "meta": { "displayModel": "...", "uuid": "..." }
}
```

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | Runtime failure (network, API, stream error) |
| `2` | Auth/setup issue (missing upstream, expired token, non-interactive without credentials) |
| `64` | Invalid CLI usage (unknown command, missing required flags) |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `PI_PERPLEXITY_UPSTREAM_DIR` | Path to local pi-perplexity checkout (required unless `--upstream` is passed) |
| `PI_AUTH_NO_BORROW` | Set to `1` to skip macOS desktop app token extraction |
| `PI_PERPLEXITY_EMAIL` | Pre-fill email for OTP login (non-interactive) |
| `PI_PERPLEXITY_OTP` | Pre-fill OTP code (non-interactive) |

## AI Agent Skills

Pre-built skill files for AI coding agents are included:

- **OpenCode**: `skills/opencode/perplexity-search.md` — copy to your OpenCode skills directory
- **Claude Code**: `skills/claude-code/perplexity-search.md` — copy to `.claude/commands/` or reference in `CLAUDE.md`

See `docs/host-setup/opencode.md` and `docs/host-setup/claude-code.md` for detailed integration guides.

## Development

```bash
# Run tests
bun test

# Type check
bunx tsc --noEmit

# Run CLI directly
bun run src/cli.ts search --query "test" --upstream /path/to/pi-perplexity
```

## License

MIT
