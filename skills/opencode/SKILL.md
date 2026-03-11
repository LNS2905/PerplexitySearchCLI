---
name: perplexity-search
description: Real-time web search via Perplexity Pro/Max subscription. Use when you need current information, documentation, news, or verification that your training data cannot provide. Supports parallel multi-query research workflows.
---

# Perplexity Web Search — Research Skill

Use `pplx-wrapper` to run real-time web searches via a Perplexity Pro/Max subscription. This skill teaches you **how to research effectively**, not just how to call the CLI.

## Prerequisites

1. **Bun** runtime installed and on `PATH`.
2. `PI_PERPLEXITY_UPSTREAM_DIR` environment variable set, or pass `--upstream <path>` on every call.
3. A cached auth token — run `pplx-wrapper login` once in an interactive terminal.

---

## When to Search (and When NOT to)

### DO search when:
- You need information **after your training cutoff** (releases, changelogs, CVEs, pricing changes).
- User asks about **rapidly evolving** libraries, APIs, or frameworks.
- You need to **verify a claim** you're unsure about — don't guess, search.
- You encounter an **unfamiliar error message**, stack trace, or obscure config option.
- User explicitly asks for **current data** (prices, news, weather, stock, sports scores).
- You need **official documentation** for a specific version or feature.

### DO NOT search when:
- The answer is in the **current codebase** — read the code first.
- The question is about **well-established concepts** your training covers reliably (e.g., "what is a closure?").
- You just searched the same topic — **don't re-search**, synthesize from existing results.
- The question is about **user's preferences or project decisions** — ask the user instead.

### Decision flowchart:
```
Is the answer in the codebase? ──YES──► Read code, don't search
        │ NO
Is it well-known stable knowledge? ──YES──► Answer from training
        │ NO
Is it time-sensitive or version-specific? ──YES──► SEARCH
        │ NO
Are you unsure and could be wrong? ──YES──► SEARCH to verify
        │ NO
Answer from training with confidence disclaimer
```

---

## Query Formulation — The Most Important Part

**Bad queries produce bad results.** The quality of your search depends almost entirely on how you phrase the query.

### Core Principles

1. **Be specific, not conversational.** Search engines rank keywords, not prose.
   - Bad: `"How do I make my React app faster?"`
   - Good: `"React performance optimization useMemo useCallback re-render reduction 2025"`

2. **Include version numbers and dates** when searching for technical content.
   - Bad: `"Next.js app router middleware"`
   - Good: `"Next.js 15 app router middleware configuration 2025"`

3. **Use domain-specific terminology** — the exact terms the documentation/community uses.
   - Bad: `"make Python faster with multiple threads"`
   - Good: `"Python asyncio vs threading GIL performance comparison"`

4. **Front-load the most important terms.** Search engines weight earlier words more.
   - Bad: `"I want to know about the new features in TypeScript 5.8"`
   - Good: `"TypeScript 5.8 new features erasable type-only imports"`

5. **Add context qualifiers** to narrow results:
   - `site:github.com` — for code/issues
   - `"official docs"` or `"documentation"` — for authoritative sources
   - Year like `2025` or `2026` — for freshness
   - `tutorial` / `example` / `migration guide` — for specific content types

### Query Templates by Research Type

| Research Type | Query Pattern | Example |
|---------------|--------------|---------|
| **Latest release** | `"<tool> <version> release notes changelog <year>"` | `"Bun 1.2 release notes changelog 2025"` |
| **Error diagnosis** | `"<exact error message>" <tool> <version>` | `"TypeError: Cannot read property 'map' of undefined" React 19 SSR` |
| **API/config lookup** | `"<tool> <version> <exact API name> documentation"` | `"Tailwind CSS v4 @theme directive documentation"` |
| **Comparison** | `"<A> vs <B> <criteria> <year> comparison"` | `"Bun vs Deno vs Node.js performance benchmark 2025"` |
| **Best practice** | `"<topic> best practices production <year>"` | `"Docker multi-stage build best practices production 2025"` |
| **Migration** | `"<tool> migrate <old version> to <new version> breaking changes"` | `"Next.js migrate 14 to 15 breaking changes app router"` |
| **Bug/issue** | `"<tool> <symptom> issue workaround site:github.com"` | `"Prisma connection pool timeout PostgreSQL issue workaround site:github.com"` |
| **News/current events** | `"<topic> <today/this week> latest"` with `--recency day` | `"AI regulation EU AI Act latest"` with `--recency week` |
| **How-to** | `"<tool> <task> example tutorial <year>"` | `"Rust async trait example tutorial 2025"` |
| **Vietnamese content** | Query in Vietnamese with Vietnamese keywords | `"giá vàng SJC hôm nay"`, `"lãi suất ngân hàng Vietcombank 2026"` |

---

## Parallel Search Strategy — Research Like a Pro

For complex topics, **decompose into independent sub-queries** and run them in parallel. This is dramatically faster and produces more comprehensive results.

### When to parallelize:
- The question has **2+ distinct facets** (e.g., "What changed in React 19 and how do I migrate?").
- You need **cross-verification** from multiple angles.
- The topic spans **different domains** (code + docs + community discussion).

### Decomposition patterns:

**Pattern 1: Facet Decomposition** — break a complex question into independent aspects.
```
User: "Should I use Drizzle or Prisma for my Next.js 15 project?"

Sub-queries (run ALL in parallel):
1. pplx-wrapper search --query "Drizzle ORM vs Prisma performance benchmark 2025"
2. pplx-wrapper search --query "Drizzle ORM Next.js 15 app router integration"
3. pplx-wrapper search --query "Prisma Next.js 15 server components edge runtime compatibility"
4. pplx-wrapper search --query "Drizzle vs Prisma developer experience TypeScript type safety"
```

**Pattern 2: Time-Layer Decomposition** — get both historical context and latest updates.
```
User: "What's the state of WebAssembly in 2025?"

Sub-queries (run ALL in parallel):
1. pplx-wrapper search --query "WebAssembly component model standard 2025 progress"
2. pplx-wrapper search --query "WebAssembly WASI preview 2 browser support" --recency month
3. pplx-wrapper search --query "WebAssembly production use cases performance 2025"
```

**Pattern 3: Source-Type Decomposition** — get different types of information.
```
User: "How do I set up OpenTelemetry in a Bun project?"

Sub-queries (run ALL in parallel):
1. pplx-wrapper search --query "OpenTelemetry Bun runtime setup official documentation"
2. pplx-wrapper search --query "OpenTelemetry Bun example project site:github.com"
3. pplx-wrapper search --query "Bun tracing observability OpenTelemetry community discussion"
```

**Pattern 4: Verification Decomposition** — cross-check claims from multiple angles.
```
User: "Is Deno 2.0 production-ready?"

Sub-queries (run ALL in parallel):
1. pplx-wrapper search --query "Deno 2.0 production readiness enterprise adoption 2025"
2. pplx-wrapper search --query "Deno 2.0 known issues limitations bugs site:github.com"
3. pplx-wrapper search --query "Deno 2.0 vs Node.js migration experience review"
```

### How to execute parallel searches:

Use your Bash tool to run multiple searches simultaneously:

```bash
# Run these in PARALLEL (multiple Bash calls in the same message):

pplx-wrapper search --query "React 19 Server Components new features"
pplx-wrapper search --query "React 19 migration guide breaking changes from 18"
pplx-wrapper search --query "React 19 performance improvements benchmark"
```

After all results return, **synthesize across all results** — cross-reference findings, note contradictions, identify gaps.

---

## Recency Filter — Use It Wisely

The `--recency` flag filters results by age. **Use it strategically, not by default.**

| Flag | Use when |
|------|----------|
| `--recency hour` | Breaking news, live events, outage status |
| `--recency day` | Today's prices, very recent announcements |
| `--recency week` | Recent releases, this week's news |
| `--recency month` | Recent but not urgent — new library features, blog posts |
| `--recency year` | Anything from the past year — good for "2025 state of X" queries |
| *(no flag)* | Default — best for most technical documentation, tutorials, comparisons |

**Warning:** Using `--recency` on evergreen topics (tutorials, docs, best practices) will **exclude high-quality older content**. Only use it when freshness genuinely matters.

---

## Interpreting Results — Don't Just Copy

After receiving search results:

1. **Check source quality.** Prioritize: official docs > reputable tech blogs > community forums > random articles.
2. **Check source freshness.** A result from "2d ago" is more relevant for current API docs than "365d ago".
3. **Cross-reference.** If only one source makes a claim, flag it as unverified. If 3+ sources agree, it's likely accurate.
4. **Watch for contradictions.** If sources disagree, note the conflict and present both sides to the user.
5. **Identify gaps.** If the search didn't fully answer the question, run a follow-up search with refined terms — don't guess.
6. **Cite sources.** When presenting search results, include the source URL so the user can verify.

### Follow-up search triggers:
- Results are **too generic** → add more specific terms or version numbers.
- Results are **outdated** → add `--recency` and current year.
- Results **contradict each other** → search for a third authoritative source.
- Results **partially answer** → decompose the unanswered part into a new query.

---

## Research Workflow — Putting It All Together

For a non-trivial research task, follow this workflow:

```
1. CLASSIFY: What type of information is needed?
   ├── Factual lookup (single query)
   ├── Technical deep-dive (2-3 parallel queries)
   ├── Comparison/decision (3-4 parallel queries)
   └── Comprehensive research (4+ parallel queries with synthesis)

2. FORMULATE: Write specific, keyword-rich queries
   ├── Use templates from the table above
   ├── Include version numbers and years
   └── Use domain-specific terminology

3. EXECUTE: Run queries (parallel when possible)
   ├── Single query → just run it
   └── Multiple queries → run ALL in parallel via multiple Bash calls

4. EVALUATE: Check results quality
   ├── Sufficient? → Synthesize and present
   ├── Gaps? → Formulate follow-up queries
   └── Contradictions? → Cross-verify with additional search

5. SYNTHESIZE: Combine findings into a coherent answer
   ├── Cross-reference across sources
   ├── Note confidence levels
   ├── Cite sources
   └── Flag any remaining uncertainties
```

---

## Anti-Patterns — What NOT to Do

| Anti-Pattern | Why It's Bad | Do This Instead |
|-------------|-------------|-----------------|
| Copy-pasting user's question as query | Too conversational, poor keyword density | Extract keywords, add specifics |
| Searching one query when topic is complex | Misses important facets | Decompose and search in parallel |
| Using `--recency` on everything | Excludes authoritative older content | Only use when freshness matters |
| Searching the same thing twice | Wastes time and API calls | Re-read previous results |
| Ignoring source quality | Could be outdated or wrong | Check dates and source reputation |
| Massive single query with everything | Search engines choke on long queries | Split into focused sub-queries |
| Not following up on partial results | Leaves gaps in understanding | Refine and search again |
| Searching before reading the codebase | Answer might already be local | Check codebase first |

---

## Command Reference

```bash
# Basic search
pplx-wrapper search --query "<keywords>"

# With recency filter
pplx-wrapper search --query "<keywords>" --recency week

# Limit sources
pplx-wrapper search --query "<keywords>" --limit 5

# JSON output (for programmatic use)
pplx-wrapper search --query "<keywords>" --json

# Explicit upstream path
pplx-wrapper search --query "<keywords>" --upstream /path/to/pi-perplexity
```

### Exit codes

| Code | Meaning |
|------|---------|
| `0` | Success — stdout contains the answer |
| `1` | Runtime failure (network, API, stream) |
| `2` | Auth/setup issue (missing token, upstream) |
| `64` | Invalid CLI usage |

Check exit code before parsing stdout. On non-zero, stderr has the error.

---

## Examples — Real Research Scenarios

### Scenario 1: Quick factual lookup
```bash
pplx-wrapper search --query "Bun 1.2 release date changelog"
```

### Scenario 2: Error diagnosis
```bash
pplx-wrapper search --query "\"ECONNRESET\" Prisma PostgreSQL connection pool timeout Docker"
```

### Scenario 3: Parallel comparison research
```bash
# Run ALL three in parallel:
pplx-wrapper search --query "tRPC vs GraphQL performance type safety 2025 comparison"
pplx-wrapper search --query "tRPC Next.js 15 app router integration example"
pplx-wrapper search --query "GraphQL Next.js 15 server components RSC support"
```

### Scenario 4: Vietnamese market data
```bash
pplx-wrapper search --query "giá vàng SJC hôm nay mua bán" --recency day
pplx-wrapper search --query "tỷ giá USD VND ngân hàng Vietcombank hôm nay" --recency day
```

### Scenario 5: Deep research with follow-up
```bash
# Round 1: broad survey
pplx-wrapper search --query "state of CSS-in-JS 2025 Tailwind styled-components comparison"

# Round 2: based on Round 1 gaps, drill deeper
pplx-wrapper search --query "Tailwind CSS v4 zero-runtime CSS performance benchmark"
pplx-wrapper search --query "styled-components React 19 Server Components compatibility"
```
