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

Be specific, not conversational — keywords beat prose. Front-load important terms, include version + year, use domain terminology.

| Type | Pattern | Example |
|------|---------|---------|
| Release | `<tool> <ver> changelog <year>` | `Bun 1.2 changelog 2025` |
| Error | `"<exact error>" <tool> <ver>` | `"ECONNRESET" Prisma PostgreSQL Docker` |
| API docs | `<tool> <ver> <API> docs` | `Tailwind v4 @theme directive docs` |
| Comparison | `<A> vs <B> <criteria> <year>` | `Drizzle vs Prisma performance 2025` |
| Migration | `<tool> <old> to <new> breaking` | `Next.js 14 to 15 breaking changes` |
| Bug/issue | `<tool> <symptom> fix site:github.com` | `Prisma pool timeout fix site:github.com` |
| Solution | `<problem> solution options <context>` | `git worktree Windows lock EPERM solution options` |
| News | `<topic> latest` + `--recency day` | `AI regulation EU latest` |

## Processing Search Output

Search output contains `## Answer`, `## Sources`, `## Meta`. The answer section holds the synthesized information — that's the primary data. Sources and Meta are supplementary.

**Token-efficient extraction rules:**
- **Extract only what you need** from the answer. Don't paste the entire output to the user — synthesize it into your response, citing source numbers inline like [1][3].
- **Sources are for citation, not reading.** The answer already synthesizes source content. Only follow source URLs if the answer is insufficient or contradictory.
- **Limit sources** with `--limit 3-5` when you only need a quick fact. Default returns up to 15 sources which wastes tokens for simple lookups.
- **Use `--json`** only when you need to programmatically parse the result (e.g., extracting URLs for follow-up fetches). Text mode is ~30% more token-efficient for reading.
- **Discard Meta section** from your reasoning — it exists for debugging, not for answering the user.

**Summarization pattern:**
```
1. Run search → receive output
2. Read the ## Answer section
3. Extract relevant facts + note source numbers [N]
4. Synthesize into your response with inline citations
5. Only quote source URLs if user explicitly asks for links
```

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
