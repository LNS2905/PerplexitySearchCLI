# PerplexitySearchCLI

Standalone CLI wrapper for Perplexity web search. Uses your Perplexity Pro/Max subscription — no API credits consumed. Designed for integration with AI coding agents (OpenCode, Claude Code).

## How It Works

`pplx-wrapper` is a thin CLI that dynamically imports search and auth functionality from a local checkout of the upstream [`pi-perplexity`](https://github.com/ivanrvpereira/pi-perplexity) extension. This architecture keeps the wrapper lightweight while reusing the battle-tested SSE client, token management, and response formatting from upstream.

```
pplx-wrapper (this repo)
    │
    └── dynamically imports at runtime ──► pi-perplexity (auto-discovered)
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
bun link   # makes pplx-wrapper available globally
```

## Setup

### 1. Clone the upstream repository

Clone `pi-perplexity` **anywhere on your machine** — the wrapper will find it automatically:

```bash
git clone https://github.com/ivanrvpereira/pi-perplexity.git
cd pi-perplexity && bun install
```

> **Recommended:** clone it as a sibling of this repo (same parent directory) for instant auto-discovery.

### 2. Verify setup

```bash
pplx-wrapper status
```

Expected output:
```
bun: available
upstream: ready      ← auto-discovered!
token: missing
interactive: yes
```

If `upstream: missing`, see [Upstream Resolution](#upstream-resolution) below.

### 3. Authenticate

Run once in an interactive terminal:

```bash
pplx-wrapper login
```

This caches your Perplexity JWT at `~/.config/pi-perplexity/auth.json` (mode `0600`).

#### Auth strategies (tried in order)

1. **Cached token** — reuses `~/.config/pi-perplexity/auth.json`
2. **macOS desktop app only** — on macOS, extracts token from the Perplexity desktop app via `defaults read` (skip with `PI_AUTH_NO_BORROW=1`)
3. **Email OTP** — interactive: prompts for email and OTP code; non-interactive: reads `PI_PERPLEXITY_EMAIL` and `PI_PERPLEXITY_OTP` from env

**Important:**
- Desktop token borrowing is currently **macOS-only**. Installing the Perplexity desktop app on Windows does **not** enable automatic token borrowing with the current implementation.
- Tokens are **not auto-refreshed proactively**. If a cached token becomes stale/expired, `pplx-wrapper search` now clears the stale cache, re-authenticates once, and retries automatically. If that recovery path also fails, you'll need to run `pplx-wrapper login` again interactively.

## Upstream Resolution

The CLI **automatically discovers** the `pi-perplexity` checkout — no manual configuration needed in most cases.

### Discovery chain (in priority order)

| # | Source | When it's used |
|---|--------|---------------|
| 1 | `--upstream <path>` flag | Explicit override per command |
| 2 | `PI_PERPLEXITY_UPSTREAM_DIR` env var | Explicit override for session/system |
| 3 | Saved config (`~/.config/pplx-wrapper/config.json`) | Cached from first successful discovery |
| 4 | **Walk-up sibling scan** | Walks up from wrapper dir & CWD, checks sibling directories at each level |
| 5 | **Bun global link** | Checks `~/.bun/install/global/node_modules/pi-perplexity` |
| 6 | **npm global** | Checks `npm root -g` for pi-perplexity |
| 7 | **Home directory scan** | Scans `~/*` for any folder containing pi-perplexity |

The first successful discovery is **automatically cached** to `~/.config/pplx-wrapper/config.json`, so scanning only runs once.

### If auto-discovery fails

Pick any one:

```bash
# Option A: Clone pi-perplexity as a sibling directory (recommended)
cd "$(dirname /path/to/PerplexitySearchCLI)"
git clone https://github.com/ivanrvpereira/pi-perplexity.git

# Option B: Point to existing checkout (saved permanently)
pplx-wrapper status --upstream /your/path/to/pi-perplexity

# Option C: Set env var
export PI_PERPLEXITY_UPSTREAM_DIR=/your/path/to/pi-perplexity

# Option D: Bun-link it from the upstream repo
cd /your/path/to/pi-perplexity && bun link
```

## Usage

### Search

Perplexity is an **AI search engine** — your query is a prompt, not just keywords. You can append format instructions to control the output:

```bash
# Basic search
pplx-wrapper search --query "latest Bun 1.2 features"

# With format directive — get concise structured output
pplx-wrapper search --query "Drizzle vs Prisma 2025. Compare in table: performance, DX, edge support"

# Bullet-point summary
pplx-wrapper search --query "Next.js 15 breaking changes. List as checklist, max 150 words"

# Code example
pplx-wrapper search --query "Hono JWT middleware. Show minimal code example only"

# With recency filter and source limit
pplx-wrapper search --query "React 19 release" --recency week --limit 5

# JSON output for programmatic use
pplx-wrapper search --query "TypeScript 5.8 changes" --json
```

#### Format directive examples

| Directive | Use case |
|-----------|----------|
| `Answer concisely in bullets, max 100 words` | Quick factual lookups |
| `Compare in table: <columns>` | A vs B decisions |
| `List top N options with one-line tradeoff each` | Solution search |
| `Steps only, numbered, no explanation` | How-to procedures |
| `Yes/no then brief reason with source` | Verification |
| `Show minimal code example only` | API usage |

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
| `--upstream <path>` | Override auto-discovered upstream path |

### Login flags

| Flag | Description |
|------|-------------|
| `--force` | Clear cached token before login |
| `--upstream <path>` | Override auto-discovered upstream path |

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
| `PI_PERPLEXITY_UPSTREAM_DIR` | Override upstream path (optional — auto-discovery handles most cases) |
| `PI_AUTH_NO_BORROW` | Set to `1` to skip macOS desktop app token extraction |
| `PI_PERPLEXITY_EMAIL` | Pre-fill email for OTP login (non-interactive) |
| `PI_PERPLEXITY_OTP` | Pre-fill OTP code (non-interactive) |

## AI Agent Skills

Pre-built skill files for AI coding agents are included:

- **OpenCode**: `skills/opencode/SKILL.md` — copy to `~/.config/opencode/skills/perplexity-search/SKILL.md`
- **Claude Code**: `skills/claude-code/SKILL.md` — copy to `~/.claude/plugins/.../perplexity-search/skills/perplexity-search/SKILL.md`

See `docs/host-setup/opencode.md` and `docs/host-setup/claude-code.md` for detailed integration guides.

## Development

```bash
# Run tests
bun test

# Type check
bunx tsc --noEmit

# Run CLI directly
bun run src/cli.ts search --query "test"
```

## License

MIT
