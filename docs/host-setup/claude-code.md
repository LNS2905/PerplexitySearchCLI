# Claude Code Setup Guide

How to configure Claude Code to use the `pplx-wrapper` Perplexity search skill.

## 1. Install Bun

The wrapper CLI requires [Bun](https://bun.sh) on your `PATH`.

```bash
curl -fsSL https://bun.sh/install | bash
```

Verify: `bun --version` should print `1.3.9` or later.

## 2. Clone the upstream repository

```bash
git clone https://github.com/ivanrvpereira/pi-perplexity.git
cd pi-perplexity && bun install
```

Note the absolute path to this checkout — you will need it below.

## 3. Configure the upstream path

Set the `PI_PERPLEXITY_UPSTREAM_DIR` environment variable to your checkout path. Add to your shell profile (`.bashrc`, `.zshrc`, etc.):

```bash
export PI_PERPLEXITY_UPSTREAM_DIR="/path/to/pi-perplexity"
```

Alternatively, pass `--upstream /path/to/pi-perplexity` on every CLI call.

## 4. Authenticate

Run the login command once in an interactive terminal:

```bash
pplx-wrapper login --upstream /path/to/pi-perplexity
```

This caches your Perplexity token at `~/.config/pi-perplexity/auth.json`.

### Auth environment variables

| Variable | Description |
|---|---|
| `PI_AUTH_NO_BORROW=1` | Skip macOS desktop app extraction, go straight to email OTP |
| `PI_PERPLEXITY_EMAIL` | Pre-fill the email prompt (useful for non-interactive setups) |
| `PI_PERPLEXITY_OTP` | Pre-fill the OTP code |

For non-interactive environments, set `PI_PERPLEXITY_EMAIL` and `PI_PERPLEXITY_OTP` as environment variables before running login.

## 5. Install the skill file

Copy `skills/claude-code/perplexity-search.md` into your Claude Code project as an instruction file (e.g., `.claude/commands/perplexity-search.md` or referenced in your CLAUDE.md). The exact location depends on your Claude Code configuration.

## 6. Verify

```bash
pplx-wrapper status --upstream /path/to/pi-perplexity
```

All four diagnostics (`bun`, `upstream`, `token`, `interactive`) should show ready values.
