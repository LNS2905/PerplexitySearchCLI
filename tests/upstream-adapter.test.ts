import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import { resolveUpstreamModules, resolveUpstreamPath } from "../src/upstream/resolve";
import { loadUpstreamAdapter } from "../src/upstream/adapter";
import { UpstreamError } from "../src/upstream/contracts";
import type { UpstreamAdapter } from "../src/upstream/contracts";

const fwd = (p: string) => p.replace(/\\/g, "/");

describe("resolveUpstreamPath", () => {
  const origEnv = process.env["PI_PERPLEXITY_UPSTREAM_DIR"];

  afterEach(() => {
    if (origEnv === undefined) {
      delete process.env["PI_PERPLEXITY_UPSTREAM_DIR"];
    } else {
      process.env["PI_PERPLEXITY_UPSTREAM_DIR"] = origEnv;
    }
  });

  it("returns CLI flag value when provided", () => {
    process.env["PI_PERPLEXITY_UPSTREAM_DIR"] = "/env/path";
    const result = resolveUpstreamPath("/cli/path");
    expect(result).toBe("/cli/path");
  });

  it("falls back to PI_PERPLEXITY_UPSTREAM_DIR when no CLI flag", () => {
    process.env["PI_PERPLEXITY_UPSTREAM_DIR"] = "/env/path";
    const result = resolveUpstreamPath(undefined);
    expect(result).toBe("/env/path");
  });

  it("throws UpstreamError with exit code 2 when neither is set", () => {
    delete process.env["PI_PERPLEXITY_UPSTREAM_DIR"];
    expect(() => resolveUpstreamPath(undefined)).toThrow(UpstreamError);
    try {
      resolveUpstreamPath(undefined);
    } catch (e) {
      expect(e).toBeInstanceOf(UpstreamError);
      expect((e as UpstreamError).exitCode).toBe(2);
    }
  });
});

describe("resolveUpstreamModules", () => {
  it("returns module entry paths for auth, client, and formatter", async () => {
    const result = await resolveUpstreamModules({ root: "tests/fixtures/upstream-valid" });
    expect(fwd(result.auth)).toContain("src/auth/login");
    expect(fwd(result.search)).toContain("src/search/client");
    expect(fwd(result.format)).toContain("src/search/format");
  });

  it("throws UpstreamError with exit code 2 for missing required files", async () => {
    try {
      await resolveUpstreamModules({ root: "tests/fixtures/upstream-invalid" });
      expect(true).toBe(false);
    } catch (e) {
      expect(e).toBeInstanceOf(UpstreamError);
      expect((e as UpstreamError).exitCode).toBe(2);
      expect((e as UpstreamError).message).toContain("missing upstream file");
    }
  });

  it("includes the missing file path in the error message", async () => {
    try {
      await resolveUpstreamModules({ root: "tests/fixtures/upstream-invalid" });
      expect(true).toBe(false);
    } catch (e) {
      expect((e as UpstreamError).message).toContain("src/search/client.ts");
    }
  });

  it("throws UpstreamError with exit code 2 for nonexistent root", async () => {
    try {
      await resolveUpstreamModules({ root: "tests/fixtures/nonexistent" });
      expect(true).toBe(false);
    } catch (e) {
      expect(e).toBeInstanceOf(UpstreamError);
      expect((e as UpstreamError).exitCode).toBe(2);
    }
  });
});

describe("loadUpstreamAdapter", () => {
  it("loads adapter from valid upstream tree", async () => {
    const adapter = await loadUpstreamAdapter("tests/fixtures/upstream-valid");
    expect(typeof adapter.authenticate).toBe("function");
    expect(typeof adapter.search).toBe("function");
    expect(typeof adapter.format).toBe("function");
  });

  it("adapter.authenticate calls through to upstream", async () => {
    const adapter = await loadUpstreamAdapter("tests/fixtures/upstream-valid");
    const result = await adapter.authenticate({});
    expect(result.type).toBe("oauth");
    expect(typeof result.access).toBe("string");
    expect(result.access.length).toBeGreaterThan(0);
  });

  it("adapter.search calls through to upstream", async () => {
    const adapter = await loadUpstreamAdapter("tests/fixtures/upstream-valid");
    const result = await adapter.search({ query: "test query" }, "fake-jwt");
    expect(result.answer).toContain("test query");
    expect(Array.isArray(result.sources)).toBe(true);
  });

  it("adapter.format calls through to upstream", async () => {
    const adapter = await loadUpstreamAdapter("tests/fixtures/upstream-valid");
    const searchResult = await adapter.search({ query: "test" }, "fake-jwt");
    const formatted = adapter.format(searchResult);
    expect(formatted).toContain("## Answer");
    expect(formatted).toContain("## Sources");
    expect(formatted).toContain("## Meta");
  });

  it("throws UpstreamError for upstream with missing files", async () => {
    try {
      await loadUpstreamAdapter("tests/fixtures/upstream-invalid");
      expect(true).toBe(false);
    } catch (e) {
      expect(e).toBeInstanceOf(UpstreamError);
      expect((e as UpstreamError).exitCode).toBe(2);
      expect((e as UpstreamError).message).toContain("missing");
    }
  });
});
