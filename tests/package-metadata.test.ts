import { describe, test, expect } from "bun:test";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const ROOT = join(import.meta.dir, "..");

function readJson(rel: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(ROOT, rel), "utf-8"));
}

describe("package.json metadata", () => {
  test("has bin entry named pplx-wrapper pointing to CLI entry", () => {
    const pkg = readJson("package.json") as { bin?: Record<string, string> };
    expect(pkg.bin).toBeDefined();
    expect(pkg.bin!["pplx-wrapper"]).toBeDefined();
    expect(pkg.bin!["pplx-wrapper"]).toMatch(/cli/i);
  });

  test("has engines.bun constraint", () => {
    const pkg = readJson("package.json") as { engines?: Record<string, string> };
    expect(pkg.engines).toBeDefined();
    expect(pkg.engines!["bun"]).toBeDefined();
  });

  test("files array includes required entries", () => {
    const pkg = readJson("package.json") as { files?: string[] };
    expect(pkg.files).toBeDefined();
    expect(pkg.files).toContainEqual("src/");
    expect(pkg.files).toContainEqual("skills/");
  });
});

describe("bunfig.toml", () => {
  test("exists", () => {
    expect(existsSync(join(ROOT, "bunfig.toml"))).toBe(true);
  });
});

describe(".env.example", () => {
  test("exists", () => {
    expect(existsSync(join(ROOT, ".env.example"))).toBe(true);
  });

  test("documents supported env vars", () => {
    const content = readFileSync(join(ROOT, ".env.example"), "utf-8");
    expect(content).toContain("PI_PERPLEXITY_UPSTREAM_DIR");
    expect(content).toContain("PI_AUTH_NO_BORROW");
    expect(content).toContain("PI_PERPLEXITY_EMAIL");
    expect(content).toContain("PI_PERPLEXITY_OTP");
  });
});
