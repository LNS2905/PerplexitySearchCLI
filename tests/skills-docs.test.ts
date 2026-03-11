import { describe, test, expect } from "bun:test";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const ROOT = join(import.meta.dir, "..");

const SKILL_FILES = [
  "skills/opencode/perplexity-search.md",
  "skills/claude-code/perplexity-search.md",
];

const SETUP_GUIDES = [
  "docs/host-setup/opencode.md",
  "docs/host-setup/claude-code.md",
];

function readFile(rel: string): string {
  const abs = join(ROOT, rel);
  if (!existsSync(abs)) throw new Error(`File not found: ${rel}`);
  return readFileSync(abs, "utf-8");
}

describe("skill files", () => {
  for (const path of SKILL_FILES) {
    describe(path, () => {
      test("exists", () => {
        expect(existsSync(join(ROOT, path))).toBe(true);
      });

      test("includes setup prerequisites section", () => {
        const content = readFile(path);
        expect(content).toMatch(/## Prerequisites/i);
        expect(content).toMatch(/[Bb]un/);
        expect(content).toMatch(/upstream/i);
      });

      test("includes exact command template with pplx-wrapper search --query", () => {
        const content = readFile(path);
        expect(content).toMatch(/## Command Template/i);
        expect(content).toContain("pplx-wrapper search --query");
      });

      test("includes when-to-use guidance", () => {
        const content = readFile(path);
        expect(content).toMatch(/## When to Use/i);
      });

      test("includes output expectations", () => {
        const content = readFile(path);
        expect(content).toMatch(/## Output/i);
        expect(content).toContain("## Answer");
        expect(content).toContain("## Sources");
        expect(content).toContain("## Meta");
      });

      test("includes phase-1 support boundary", () => {
        const content = readFile(path);
        expect(content).toMatch(/[Pp]hase.?1/);
        expect(content).toMatch(/OpenCode/i);
        expect(content).toMatch(/Claude Code/i);
      });

      test("documents text mode as default and when --json is justified", () => {
        const content = readFile(path);
        expect(content).toMatch(/text/i);
        expect(content).toMatch(/--json/);
      });
    });
  }
});

describe("host setup guides", () => {
  for (const path of SETUP_GUIDES) {
    describe(path, () => {
      test("exists", () => {
        expect(existsSync(join(ROOT, path))).toBe(true);
      });

      test("includes Bun requirement", () => {
        const content = readFile(path);
        expect(content).toMatch(/[Bb]un/);
        expect(content).toMatch(/bun\.sh|PATH/i);
      });

      test("includes upstream path configuration", () => {
        const content = readFile(path);
        expect(content).toMatch(/upstream/i);
        expect(content).toMatch(/PI_PERPLEXITY_UPSTREAM_DIR|--upstream/);
      });

      test("includes auth env vars", () => {
        const content = readFile(path);
        expect(content).toMatch(/PI_AUTH_NO_BORROW/);
        expect(content).toMatch(/PI_PERPLEXITY_EMAIL/);
        expect(content).toMatch(/PI_PERPLEXITY_OTP/);
      });
    });
  }
});
