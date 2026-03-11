---
name: perplexity-search
description: Real-time web search via Perplexity Pro/Max subscription. This skill should be used when the user needs current information, recent documentation, news, verification of claims, error diagnosis, or any question where training data may be outdated or insufficient. Supports parallel multi-query research. Use this skill proactively whenever you encounter unfamiliar APIs, recent releases, version-specific behavior, current prices/data, or need to verify uncertain claims — even if the user doesn't explicitly ask you to search.
---

# Perplexity Web Search

Run `pplx-wrapper search --query "<keywords>"` for real-time web search. Auto-discovers upstream — no config needed.

**Auth:** `pplx-wrapper login` once interactively. If token expires mid-session, search auto-recovers once.
**Flags:** `--recency hour|day|week|month|year`, `--limit N`, `--json`. Exit `0`=ok, `1`=runtime, `2`=auth, `64`=usage.

## When to Search

Search when: post-cutoff info, evolving libraries, unfamiliar errors, current data, version-specific docs, uncertain claims, user needs solution options for a problem they don't know how to approach.
Skip when: answer is in codebase, well-known stable knowledge, already searched, user preference question.

```
Codebase has it? ─YES─► Read code     Known stable? ─YES─► Answer from training
       │ NO                                  │ NO
Time-sensitive / version-specific? ─YES─► SEARCH
       │ NO
Unsure and could be wrong? ─YES─► SEARCH to verify
       │ NO
Answer with confidence disclaimer
```

## Query Formulation

Perplexity is an **AI search engine** — your query is a prompt, not just keywords. You can combine search terms with format instructions to control the output.

### Structure: `<search terms>. <format directive>`

Append a format directive after the search keywords to get compact, structured output:

```
<keywords + version + year>. Answer in bullet points, max 150 words, cite sources inline.
```

### Format directives (append to any query)

| Directive | When to use | Example suffix |
|-----------|-------------|----------------|
| `Answer concisely in bullets` | Quick factual lookups | `Bun 1.2 changelog 2025. List key changes in bullets, max 100 words` |
| `Compare in a table` | A vs B decisions | `Drizzle vs Prisma 2025. Compare in table: performance, DX, edge support` |
| `List top N options` | Solution search | `React state management 2025. List top 5 options with one-line tradeoff each` |
| `Steps only, no explanation` | How-to procedures | `Deploy Bun app to Fly.io. Steps only, numbered, no explanation` |
| `Yes/no then brief reason` | Verification queries | `Does Bun 1.2 support node:http2? Yes/no then brief reason with source` |
| `Code example only` | API usage lookup | `Hono framework JWT middleware. Show minimal code example only` |

### Query type patterns

| Type | Pattern |
|------|---------|
| Release | `<tool> <ver> changelog <year>. Key changes in bullets` |
| Error | `"<exact error>" <tool> <ver>. Root cause and fix, concise` |
| API docs | `<tool> <ver> <API> usage. Show code example` |
| Comparison | `<A> vs <B> <year>. Compare in table: <criteria>` |
| Migration | `<tool> <old> to <new> breaking changes. List as checklist` |
| Bug/issue | `<tool> <symptom> fix site:github.com. Steps to resolve` |
| Solution | `<problem> <context>. List top 3 solutions with tradeoffs` |

## Processing Output

Output has `## Answer`, `## Sources`, `## Meta`. Answer is the primary data; sources/meta are supplementary.

- **Extract → synthesize → cite inline.** Read Answer, extract relevant facts, weave into your response with `[1][3]` citations. Don't paste raw output to user.
- **Sources are for citation only.** Answer already synthesizes them. Follow URLs only if answer is insufficient.
- **Use `--limit 3-5`** for simple lookups. Default 15 sources wastes tokens for quick facts.
- **Text mode > `--json`** (~30% fewer tokens). Only use `--json` when programmatically parsing URLs.
- **Discard Meta** — it's for debugging, not reasoning.

## Parallel Search

For complex topics, decompose into 2-4 independent sub-queries and run ALL in parallel (multiple Bash calls in one message). Synthesize across ALL results afterward.

**When:** 2+ facets, cross-verification needed, multiple domains, or user wants solution options but doesn't know which approach to choose.

**Example — "Should I use Drizzle or Prisma for Next.js 15?":**
```bash
# Run ALL in parallel:
pplx-wrapper search --query "Drizzle vs Prisma performance benchmark 2025" --limit 5
pplx-wrapper search --query "Drizzle Next.js 15 app router integration" --limit 5
pplx-wrapper search --query "Prisma Next.js 15 edge runtime compatibility" --limit 5
```

**Decomposition types:**
- **Facet** — split into independent aspects (performance, DX, compatibility)
- **Time-layer** — historical context + latest updates (`--recency` on the latter)
- **Source-type** — official docs + GitHub examples + community discussion
- **Verification** — adoption reports + known issues + migration experiences

## Recency Filter

Use `--recency` only when freshness matters. Omitting it keeps high-quality older content.

| Flag | For |
|------|-----|
| `hour` / `day` | Breaking news, live prices, outage status |
| `week` / `month` | Recent releases, new features |
| `year` | Annual reviews, "state of X" |
| *(none)* | Docs, tutorials, best practices, comparisons |

## After Searching

Prioritize: official docs > tech blogs > forums. Cross-reference claims (1 source = unverified, 3+ = reliable). If gaps or contradictions remain, refine query and search again — don't guess.
