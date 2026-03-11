# Perplexity Web Search — Claude Code Skill

Use `pplx-wrapper` to run real-time web searches via a Perplexity Pro/Max subscription. Phase 1 supports OpenCode and Claude Code only.

## Prerequisites

1. **Bun** runtime installed and on `PATH` ([bun.sh](https://bun.sh)).
2. A **local checkout** of the upstream `pi-perplexity` repository.
3. The `PI_PERPLEXITY_UPSTREAM_DIR` environment variable set to the upstream checkout path, or pass `--upstream <path>` on every call.
4. A cached auth token — run `pplx-wrapper login --upstream <path>` once in an interactive terminal.

## When to Use

Invoke this skill when you need **current, real-time information** that your training data may not cover:

- Recent releases, changelogs, or announcements.
- Current documentation for rapidly evolving libraries.
- News, blog posts, or discussions from the last hours/days/weeks.
- Verifying whether a bug, feature, or API exists in the latest version.

Do **not** use for questions you can answer from the codebase or your training data.

## Command Template

```bash
pplx-wrapper search --query "<your question here>"
```

### With options

```bash
pplx-wrapper search --query "<question>" --recency week --limit 5
```

### JSON output (for programmatic parsing)

```bash
pplx-wrapper search --query "<question>" --json
```

Default **text mode** is preferred for most uses — it returns a human-readable answer with sources that you can reason over directly. Use `--json` only when you need to extract structured fields programmatically (e.g., iterating over source URLs or feeding results into another tool).

### Available flags

| Flag | Description |
|------|-------------|
| `--query <text>` | Search query (required) |
| `--recency <period>` | Filter by age: `hour`, `day`, `week`, `month`, `year` |
| `--limit <N>` | Max sources to include (1–50) |
| `--json` | Output JSON instead of default text |
| `--upstream <path>` | Path to upstream pi-perplexity checkout (overrides env var) |

## Output Expectations

### Text mode (default)

Successful output follows this structure:

```
## Answer
<synthesized answer>

## Sources
N sources
[1] Title (2d ago)
    https://url
    snippet preview...

## Meta
Provider: perplexity (oauth)
Model: <display_model>
```

### JSON mode

```json
{
  "answer": "...",
  "sources": [{ "title": "...", "url": "...", "snippet": "...", "date": "..." }],
  "meta": { "displayModel": "...", "uuid": "..." }
}
```

### Exit codes

| Code | Meaning |
|------|---------|
| `0` | Success — stdout contains valid output |
| `1` | Runtime failure (network, API, stream error) |
| `2` | Auth/setup issue (missing upstream, expired token) |
| `64` | Invalid CLI usage |

Check exit code before parsing stdout. On non-zero exit, stderr contains the error message.

## Phase 1 Support Boundary

This skill is verified for **OpenCode** and **Claude Code** only. Other hosts (Cursor, Windsurf, etc.) are not yet supported and may require different integration approaches.
