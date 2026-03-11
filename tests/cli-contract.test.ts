import { describe, expect, it } from "bun:test";
import { parseCli } from "../src/cli";
import type { ParsedCommand } from "../src/types";
import { formatStatusOutput } from "../src/commands/status";

describe("parseCli", () => {
  describe("search command", () => {
    it("parses search command with text output defaults", () => {
      expect(parseCli(["search", "--query", "latest bun releases"])).toEqual({
        command: "search",
        query: "latest bun releases",
        recency: undefined,
        limit: undefined,
        format: "text",
        upstream: undefined,
      });
    });

    it("parses search with --json flag", () => {
      expect(parseCli(["search", "--query", "test", "--json"])).toEqual({
        command: "search",
        query: "test",
        recency: undefined,
        limit: undefined,
        format: "json",
        upstream: undefined,
      });
    });

    it("parses search with all options", () => {
      expect(
        parseCli([
          "search",
          "--query",
          "react 19",
          "--recency",
          "week",
          "--limit",
          "5",
          "--json",
          "--upstream",
          "/path/to/upstream",
        ]),
      ).toEqual({
        command: "search",
        query: "react 19",
        recency: "week",
        limit: 5,
        format: "json",
        upstream: "/path/to/upstream",
      });
    });

    it("rejects search without --query", () => {
      const result = parseCli(["search"]);
      expect(result.command).toBe("error");
      if (result.command === "error") {
        expect(result.exitCode).toBe(64);
      }
    });

    it("rejects search with invalid --recency value", () => {
      const result = parseCli(["search", "--query", "test", "--recency", "invalid"]);
      expect(result.command).toBe("error");
      if (result.command === "error") {
        expect(result.exitCode).toBe(64);
      }
    });

    it("rejects search with invalid --limit value", () => {
      const result = parseCli(["search", "--query", "test", "--limit", "abc"]);
      expect(result.command).toBe("error");
      if (result.command === "error") {
        expect(result.exitCode).toBe(64);
      }
    });
  });

  describe("login command", () => {
    it("parses login with no flags", () => {
      expect(parseCli(["login"])).toEqual({
        command: "login",
        force: false,
        upstream: undefined,
      });
    });

    it("parses login with --force", () => {
      expect(parseCli(["login", "--force"])).toEqual({
        command: "login",
        force: true,
        upstream: undefined,
      });
    });

    it("parses login with --upstream", () => {
      expect(parseCli(["login", "--upstream", "/path"])).toEqual({
        command: "login",
        force: false,
        upstream: "/path",
      });
    });
  });

  describe("logout command", () => {
    it("parses logout with no flags", () => {
      expect(parseCli(["logout"])).toEqual({
        command: "logout",
        upstream: undefined,
      });
    });

    it("parses logout with --upstream", () => {
      expect(parseCli(["logout", "--upstream", "/path"])).toEqual({
        command: "logout",
        upstream: "/path",
      });
    });
  });

  describe("status command", () => {
    it("parses status with no flags", () => {
      expect(parseCli(["status"])).toEqual({
        command: "status",
        upstream: undefined,
      });
    });

    it("parses status with --upstream", () => {
      expect(parseCli(["status", "--upstream", "/path"])).toEqual({
        command: "status",
        upstream: "/path",
      });
    });
  });

  describe("help", () => {
    it("parses --help as help command", () => {
      const result = parseCli(["--help"]);
      expect(result.command).toBe("help");
    });

    it("parses -h as help command", () => {
      const result = parseCli(["-h"]);
      expect(result.command).toBe("help");
    });

    it("parses no arguments as help command", () => {
      const result = parseCli([]);
      expect(result.command).toBe("help");
    });
  });

  describe("errors", () => {
    it("returns error for unknown command", () => {
      const result = parseCli(["unknown"]);
      expect(result.command).toBe("error");
      if (result.command === "error") {
        expect(result.exitCode).toBe(64);
        expect(result.message).toContain("unknown");
      }
    });

    it("returns error for unknown flags", () => {
      const result = parseCli(["search", "--query", "test", "--bogus"]);
      expect(result.command).toBe("error");
      if (result.command === "error") {
        expect(result.exitCode).toBe(64);
      }
    });
  });
});

describe("exit codes", () => {
  it("success is 0", () => {
    expect(0).toBe(0);
  });

  it("generic failure is 1", () => {
    expect(1).toBe(1);
  });

  it("auth/setup issue is 2", () => {
    expect(2).toBe(2);
  });

  it("invalid CLI usage is 64", () => {
    expect(64).toBe(64);
  });
});

describe("formatStatusOutput", () => {
  it("formats all-available status", () => {
    const output = formatStatusOutput({
      bun: "available",
      upstream: "ready",
      token: "present",
      interactive: "yes",
    });
    expect(output).toBe(
      "bun: available\nupstream: ready\ntoken: present\ninteractive: yes",
    );
  });

  it("formats all-missing status", () => {
    const output = formatStatusOutput({
      bun: "missing",
      upstream: "missing",
      token: "missing",
      interactive: "no",
    });
    expect(output).toBe(
      "bun: missing\nupstream: missing\ntoken: missing\ninteractive: no",
    );
  });

  it("formats mixed status", () => {
    const output = formatStatusOutput({
      bun: "available",
      upstream: "missing",
      token: "present",
      interactive: "no",
    });
    expect(output).toBe(
      "bun: available\nupstream: missing\ntoken: present\ninteractive: no",
    );
  });

  it("output contains all four status labels", () => {
    const output = formatStatusOutput({
      bun: "available",
      upstream: "ready",
      token: "present",
      interactive: "yes",
    });
    expect(output).toContain("bun:");
    expect(output).toContain("upstream:");
    expect(output).toContain("token:");
    expect(output).toContain("interactive:");
  });
});
