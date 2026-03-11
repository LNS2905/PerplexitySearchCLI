import { describe, expect, it } from "bun:test";
import { resolve } from "node:path";

const CLI = resolve(import.meta.dir, "../src/cli.ts");
const UPSTREAM = resolve(import.meta.dir, "fixtures/upstream-valid");

async function run(args: string[]): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  const proc = Bun.spawn(["bun", "run", CLI, ...args], {
    env: {
      ...process.env,
      PI_PERPLEXITY_UPSTREAM_DIR: undefined,
    },
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const exitCode = await proc.exited;
  return { exitCode, stdout, stderr };
}

describe("e2e smoke: status", () => {
  it("prints all four diagnostic labels", async () => {
    const { stdout, exitCode } = await run(["status", "--upstream", UPSTREAM]);
    expect(stdout).toContain("bun:");
    expect(stdout).toContain("upstream:");
    expect(stdout).toContain("token:");
    expect(stdout).toContain("interactive:");
    expect([0, 2]).toContain(exitCode);
  });

  it("reports upstream as ready for valid fixture", async () => {
    const { stdout } = await run(["status", "--upstream", UPSTREAM]);
    expect(stdout).toContain("upstream: ready");
  });

  it("reports bun as available", async () => {
    const { stdout } = await run(["status", "--upstream", UPSTREAM]);
    expect(stdout).toContain("bun: available");
  });
});

describe("e2e smoke: logout", () => {
  it("exits 0", async () => {
    const { exitCode } = await run(["logout", "--upstream", UPSTREAM]);
    expect(exitCode).toBe(0);
  });

  it("prints logout confirmation", async () => {
    const { stdout } = await run(["logout", "--upstream", UPSTREAM]);
    expect(stdout).toMatch(/logged out|token already absent/);
  });
});

describe("e2e smoke: search text", () => {
  it("exits 0 and contains all three sections", async () => {
    const { exitCode, stdout } = await run([
      "search", "--query", "bun releases", "--upstream", UPSTREAM,
    ]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("## Answer");
    expect(stdout).toContain("## Sources");
    expect(stdout).toContain("## Meta");
  });

  it("answer includes the query text from fixture", async () => {
    const { stdout } = await run([
      "search", "--query", "bun releases", "--upstream", UPSTREAM,
    ]);
    expect(stdout).toContain("bun releases");
  });
});

describe("e2e smoke: search --json", () => {
  it("exits 0 and returns valid JSON", async () => {
    const { exitCode, stdout } = await run([
      "search", "--query", "bun releases", "--json", "--upstream", UPSTREAM,
    ]);
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(parsed).toBeDefined();
  });

  it("JSON has answer, sources, and meta keys", async () => {
    const { stdout } = await run([
      "search", "--query", "bun releases", "--json", "--upstream", UPSTREAM,
    ]);
    const parsed = JSON.parse(stdout);
    expect(typeof parsed.answer).toBe("string");
    expect(Array.isArray(parsed.sources)).toBe(true);
    expect(parsed.meta).toBeDefined();
  });

  it("JSON answer contains fixture response", async () => {
    const { stdout } = await run([
      "search", "--query", "bun releases", "--json", "--upstream", UPSTREAM,
    ]);
    const parsed = JSON.parse(stdout);
    expect(parsed.answer).toContain("bun releases");
  });

  it("JSON sources include fixture source entry", async () => {
    const { stdout } = await run([
      "search", "--query", "test", "--json", "--upstream", UPSTREAM,
    ]);
    const parsed = JSON.parse(stdout);
    expect(parsed.sources.length).toBeGreaterThan(0);
    expect(parsed.sources[0].url).toBe("https://example.com");
  });
});
