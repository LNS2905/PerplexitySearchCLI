import { describe, expect, it } from "bun:test";
import { renderSearchOutput } from "../src/output/text";
import { renderJsonOutput } from "../src/output/json";
import { runSearch, type SearchDeps } from "../src/commands/search";
import type { WrapperSearchResult } from "../src/upstream/contracts";

const FIXTURE_RESULT: WrapperSearchResult = {
  answer: "Fixture answer for: demo",
  sources: [{ title: "Example", url: "https://example.com", snippet: "A snippet" }],
  displayModel: "sonar-pro",
  uuid: "test-uuid-123",
};

const FIXTURE_FORMATTED =
  "## Answer\nFixture answer for: demo\n\n## Sources\n1 sources\n\n## Meta\nProvider: perplexity (oauth)\nModel: sonar-pro";

function makeDeps(overrides?: Partial<SearchDeps>): SearchDeps & { stdout: string[]; stderr: string[] } {
  const stdoutBuf: string[] = [];
  const stderrBuf: string[] = [];
  return {
    stdout: stdoutBuf,
    stderr: stderrBuf,
    write: (t: string) => { stdoutBuf.push(t); },
    writeError: (t: string) => { stderrBuf.push(t); },
    loadAdapter: async () => ({
      authenticate: async () => ({ type: "oauth" as const, access: "test-jwt" }),
      search: async () => FIXTURE_RESULT,
      format: () => FIXTURE_FORMATTED,
    }),
    loadToken: async () => ({ type: "oauth" as const, access: "cached-jwt" }),
    clearToken: async () => {},
    ...overrides,
  };
}

describe("renderSearchOutput", () => {
  it("renders canonical text sections", () => {
    const output = renderSearchOutput({
      answer: "A",
      sources: [],
      displayModel: "sonar-pro",
    });
    expect(output).toContain("## Answer");
    expect(output).toContain("## Sources");
    expect(output).toContain("## Meta");
  });

  it("delegates to adapter format function", () => {
    const fmt = (r: WrapperSearchResult) =>
      `## Answer\n${r.answer}\n\n## Sources\n0 sources\n\n## Meta\nModel: ${r.displayModel}`;
    const output = renderSearchOutput(
      { answer: "Test", sources: [], displayModel: "m" },
      fmt,
    );
    expect(output).toContain("## Answer");
    expect(output).toContain("Test");
    expect(output).toContain("Model: m");
  });
});

describe("renderJsonOutput", () => {
  it("returns object with answer, sources, meta", () => {
    const json = renderJsonOutput(FIXTURE_RESULT);
    expect(json.answer).toBe("Fixture answer for: demo");
    expect(json.sources).toHaveLength(1);
    expect(json.sources[0].url).toBe("https://example.com");
    expect(json.meta.displayModel).toBe("sonar-pro");
    expect(json.meta.uuid).toBe("test-uuid-123");
  });

  it("handles missing optional fields", () => {
    const json = renderJsonOutput({ answer: "A", sources: [] });
    expect(json.meta.displayModel).toBeUndefined();
    expect(json.meta.uuid).toBeUndefined();
  });
});

describe("runSearch", () => {
  it("exits 0 and outputs text by default with cached token", async () => {
    const deps = makeDeps();
    const code = await runSearch(
      { command: "search", query: "demo", recency: undefined, limit: undefined, format: "text", upstream: undefined },
      deps,
    );
    expect(code).toBe(0);
    const out = deps.stdout.join("");
    expect(out).toContain("## Answer");
    expect(out).toContain("## Sources");
    expect(out).toContain("## Meta");
  });

  it("exits 0 and outputs valid JSON with --json", async () => {
    const deps = makeDeps();
    const code = await runSearch(
      { command: "search", query: "demo", recency: undefined, limit: undefined, format: "json", upstream: undefined },
      deps,
    );
    expect(code).toBe(0);
    const out = deps.stdout.join("");
    const parsed = JSON.parse(out);
    expect(parsed.answer).toBe("Fixture answer for: demo");
    expect(parsed.sources).toBeArray();
    expect(parsed.meta).toBeDefined();
    expect(parsed.meta.displayModel).toBe("sonar-pro");
    expect(parsed.meta.uuid).toBe("test-uuid-123");
  });

  it("exits 2 when adapter loading fails", async () => {
    const deps = makeDeps({
      loadAdapter: async () => { throw new (await import("../src/upstream/contracts")).UpstreamError("missing upstream"); },
    });
    const code = await runSearch(
      { command: "search", query: "demo", recency: undefined, limit: undefined, format: "text", upstream: undefined },
      deps,
    );
    expect(code).toBe(2);
    expect(deps.stderr.join("")).toContain("missing upstream");
  });

  it("exits 2 when no cached token and authenticate fails with auth error", async () => {
    const deps = makeDeps({
      loadToken: async () => null,
      loadAdapter: async () => ({
        authenticate: async () => { throw new Error("auth failed"); },
        search: async () => FIXTURE_RESULT,
        format: () => FIXTURE_FORMATTED,
      }),
    });
    const code = await runSearch(
      { command: "search", query: "demo", recency: undefined, limit: undefined, format: "text", upstream: undefined },
      deps,
    );
    expect(code).toBe(2);
    expect(deps.stderr.join("")).toContain("auth failed");
  });

  it("exits 1 when search call fails", async () => {
    const deps = makeDeps({
      loadAdapter: async () => ({
        authenticate: async () => ({ type: "oauth" as const, access: "jwt" }),
        search: async () => { throw new Error("network timeout"); },
        format: () => "",
      }),
    });
    const code = await runSearch(
      { command: "search", query: "demo", recency: undefined, limit: undefined, format: "text", upstream: undefined },
      deps,
    );
    expect(code).toBe(1);
    expect(deps.stderr.join("")).toContain("network timeout");
  });

  it("authenticates when no cached token is available", async () => {
    let authenticated = false;
    const deps = makeDeps({
      loadToken: async () => null,
      loadAdapter: async () => ({
        authenticate: async () => { authenticated = true; return { type: "oauth" as const, access: "new-jwt" }; },
        search: async () => FIXTURE_RESULT,
        format: () => FIXTURE_FORMATTED,
      }),
    });
    const code = await runSearch(
      { command: "search", query: "demo", recency: undefined, limit: undefined, format: "text", upstream: undefined },
      deps,
    );
    expect(code).toBe(0);
    expect(authenticated).toBe(true);
  });

  it("passes recency and limit to search", async () => {
    let capturedParams: { query: string; recency?: string; limit?: number } | undefined;
    const deps = makeDeps({
      loadAdapter: async () => ({
        authenticate: async () => ({ type: "oauth" as const, access: "jwt" }),
        search: async (params) => { capturedParams = params; return FIXTURE_RESULT; },
        format: () => FIXTURE_FORMATTED,
      }),
    });
    await runSearch(
      { command: "search", query: "test q", recency: "week", limit: 5, format: "text", upstream: undefined },
      deps,
    );
    expect(capturedParams?.query).toBe("test q");
    expect(capturedParams?.recency).toBe("week");
    expect(capturedParams?.limit).toBe(5);
  });

  it("re-authenticates and retries once when cached token is stale", async () => {
    let cleared = false;
    let authenticated = false;
    let searchCalls = 0;

    const deps = makeDeps({
      loadToken: async () => ({ type: "oauth" as const, access: "stale-jwt" }),
      clearToken: async () => {
        cleared = true;
      },
      loadAdapter: async () => ({
        authenticate: async () => {
          authenticated = true;
          return { type: "oauth" as const, access: "fresh-jwt" };
        },
        search: async (_params, jwt) => {
          searchCalls += 1;
          if (searchCalls === 1 && jwt === "stale-jwt") {
            throw new Error("401 Unauthorized");
          }
          if (jwt !== "fresh-jwt") {
            throw new Error(`unexpected jwt: ${jwt}`);
          }
          return FIXTURE_RESULT;
        },
        format: () => FIXTURE_FORMATTED,
      }),
    });

    const code = await runSearch(
      { command: "search", query: "demo", recency: undefined, limit: undefined, format: "text", upstream: undefined },
      deps,
    );

    expect(code).toBe(0);
    expect(cleared).toBe(true);
    expect(authenticated).toBe(true);
    expect(searchCalls).toBe(2);
    expect(deps.stdout.join("")).toContain("## Answer");
  });

  it("returns auth/setup error when stale token retry also cannot authenticate", async () => {
    let cleared = false;

    const deps = makeDeps({
      loadToken: async () => ({ type: "oauth" as const, access: "stale-jwt" }),
      clearToken: async () => {
        cleared = true;
      },
      loadAdapter: async () => ({
        authenticate: async () => {
          throw new Error("desktop + otp unavailable");
        },
        search: async () => {
          throw new Error("403 Forbidden");
        },
        format: () => FIXTURE_FORMATTED,
      }),
    });

    const code = await runSearch(
      { command: "search", query: "demo", recency: undefined, limit: undefined, format: "text", upstream: undefined },
      deps,
    );

    expect(code).toBe(2);
    expect(cleared).toBe(true);
    expect(deps.stderr.join("")).toContain("desktop + otp unavailable");
  });
});
