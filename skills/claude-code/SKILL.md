---
name: perplexity-search
description: Real-time web search via Perplexity Pro/Max subscription. This skill should be used when the user needs current information, recent documentation, news, verification of claims, error diagnosis, or any question where training data may be outdated or insufficient. Supports parallel multi-query research. Use this skill proactively whenever you encounter unfamiliar APIs, recent releases, version-specific behavior, current prices/data, or need to verify uncertain claims — even if the user doesn't explicitly ask you to search.
---

# Perplexity Web Search

Run `pplx-wrapper search --query "<keywords>"` for real-time web search. Upstream `pi-perplexity` is auto-discovered — no config needed.

**Auth:** run `pplx-wrapper login` once interactively. Flags: `--recency hour|day|week|month|year`, `--limit N`, `--json`. Exit `0`=ok, `1`=runtime, `2`=auth, `64`=usage.

## When to Search

Search when: post-cutoff info, evolving libraries, unfamiliar errors, current data, version-specific docs, uncertain claims.
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

The query determines result quality. Be specific, not conversational — keywords beat prose.

**Rules:** front-load important terms, include version + year, use domain terminology, add qualifiers (`site:github.com`, `"documentation"`, year).

| Research Type | Pattern | Example |
|---------------|---------|---------|
| Release | `<tool> <ver> release changelog <year>` | `Bun 1.2 release changelog 2025` |
| Error | `"<exact error>" <tool> <ver>` | `"ECONNRESET" Prisma PostgreSQL Docker` |
| API docs | `<tool> <ver> <API name> documentation` | `Tailwind v4 @theme directive docs` |
| Comparison | `<A> vs <B> <criteria> <year>` | `Drizzle vs Prisma performance 2025` |
| Migration | `<tool> migrate <old> to <new> breaking` | `Next.js 14 to 15 breaking changes` |
| Bug/issue | `<tool> <symptom> workaround site:github.com` | `Prisma pool timeout workaround site:github.com` |
| News | `<topic> latest` + `--recency day` | `AI regulation EU latest --recency week` |
| Vietnamese | Vietnamese keywords naturally | `giá vàng SJC hôm nay --recency day` |

## Parallel Search

For complex topics, decompose into 2-4 independent sub-queries and run ALL in parallel (multiple Bash calls in one message). Synthesize across results afterward.

**When:** 2+ facets, cross-verification needed, multiple domains (code + docs + community).

**Example — "Should I use Drizzle or Prisma for Next.js 15?":**
```bash
# Run ALL in parallel:
pplx-wrapper search --query "Drizzle vs Prisma performance benchmark 2025"
pplx-wrapper search --query "Drizzle Next.js 15 app router integration"
pplx-wrapper search --query "Prisma Next.js 15 edge runtime compatibility"
```

**Decomposition types:**
- **Facet** — split question into independent aspects (performance, DX, compatibility)
- **Time-layer** — historical context + latest updates (use `--recency` on the latter)
- **Source-type** — official docs + GitHub examples + community discussion
- **Verification** — adoption reports + known issues + migration experiences

## Recency Filter

Use `--recency` only when freshness matters. Omitting it is correct for most technical queries — it keeps high-quality older content in results.

| Flag | For |
|------|-----|
| `hour` / `day` | Breaking news, live prices, outage status |
| `week` / `month` | Recent releases, new features |
| `year` | Annual reviews, "state of X" |
| *(none)* | Docs, tutorials, best practices, comparisons |

## After Searching

Prioritize: official docs > tech blogs > forums. Cross-reference claims (1 source = unverified, 3+ = reliable). If results have gaps or contradictions, refine terms and search again — don't guess.
