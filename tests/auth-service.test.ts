import { describe, expect, it } from "bun:test";
import { getAuthMode } from "../src/auth/service";
import { createPrompts } from "../src/auth/prompts";
import { runLogin } from "../src/commands/login";
import { runLogout } from "../src/commands/logout";

describe("getAuthMode", () => {
  it("prefers cached token before prompting", async () => {
    const mode = await getAuthMode({ hasStoredToken: true, isInteractive: false, platform: "linux" });
    expect(mode).toBe("cached");
  });

  it("returns cached when token present even on macOS interactive", async () => {
    const mode = await getAuthMode({ hasStoredToken: true, isInteractive: true, platform: "darwin" });
    expect(mode).toBe("cached");
  });

  it("returns desktop-borrow on macOS without cache when borrow not disabled", async () => {
    const mode = await getAuthMode({ hasStoredToken: false, isInteractive: false, platform: "darwin", borrowDisabled: false });
    expect(mode).toBe("desktop-borrow");
  });

  it("skips desktop-borrow when PI_AUTH_NO_BORROW is set", async () => {
    const mode = await getAuthMode({ hasStoredToken: false, isInteractive: true, platform: "darwin", borrowDisabled: true });
    expect(mode).toBe("otp-interactive");
  });

  it("returns otp-interactive for non-macOS interactive shell without cache", async () => {
    const mode = await getAuthMode({ hasStoredToken: false, isInteractive: true, platform: "linux" });
    expect(mode).toBe("otp-interactive");
  });

  it("returns otp-env when env credentials present in non-interactive mode", async () => {
    const mode = await getAuthMode({ hasStoredToken: false, isInteractive: false, platform: "linux", hasEnvEmail: true });
    expect(mode).toBe("otp-env");
  });

  it("fails in non-interactive mode when env and cache are missing", async () => {
    const mode = await getAuthMode({ hasStoredToken: false, isInteractive: false, platform: "linux" });
    expect(mode).toBe("setup-error");
  });

  it("fails in non-interactive mode on macOS when borrow disabled and no env", async () => {
    const mode = await getAuthMode({ hasStoredToken: false, isInteractive: false, platform: "darwin", borrowDisabled: true });
    expect(mode).toBe("setup-error");
  });
});

describe("runLogin", () => {
  it("exits 0 when authenticate succeeds with cached token", async () => {
    const output: string[] = [];
    const errOutput: string[] = [];
    const code = await runLogin(
      { command: "login", force: false, upstream: undefined },
      {
        stdout: (t) => output.push(t),
        stderr: (t) => errOutput.push(t),
        isInteractive: () => true,
        authenticate: async () => ({ type: "oauth" as const, access: "test-token" }),
        clearToken: async () => {},
        loadToken: async () => ({ type: "oauth" as const, access: "test-token" }),
      },
    );
    expect(code).toBe(0);
    expect(output.join("")).toContain("logged in");
  });

  it("clears token before auth when --force is set", async () => {
    let cleared = false;
    const code = await runLogin(
      { command: "login", force: true, upstream: undefined },
      {
        stdout: () => {},
        stderr: () => {},
        isInteractive: () => true,
        authenticate: async () => ({ type: "oauth" as const, access: "new-token" }),
        clearToken: async () => { cleared = true; },
        loadToken: async () => null,
      },
    );
    expect(code).toBe(0);
    expect(cleared).toBe(true);
  });

  it("exits 2 in non-interactive mode when no cached token and no env email", async () => {
    const errOutput: string[] = [];
    const code = await runLogin(
      { command: "login", force: false, upstream: undefined },
      {
        stdout: () => {},
        stderr: (t) => errOutput.push(t),
        isInteractive: () => false,
        authenticate: async () => { throw new Error("should not be called"); },
        clearToken: async () => {},
        loadToken: async () => null,
        envEmail: undefined,
        borrowDisabled: true,
        platform: "linux",
      },
    );
    expect(code).toBe(2);
    expect(errOutput.join("").toLowerCase()).toContain("non-interactive");
  });

  it("propagates auth errors with exit code 1", async () => {
    const errOutput: string[] = [];
    const code = await runLogin(
      { command: "login", force: false, upstream: undefined },
      {
        stdout: () => {},
        stderr: (t) => errOutput.push(t),
        isInteractive: () => true,
        authenticate: async () => { throw new Error("network failure"); },
        clearToken: async () => {},
        loadToken: async () => null,
      },
    );
    expect(code).toBe(1);
    expect(errOutput.join("")).toContain("network failure");
  });
});

describe("runLogout", () => {
  it("exits 0 and prints logged out when token exists", async () => {
    const output: string[] = [];
    let cleared = false;
    const code = await runLogout(
      { command: "logout", upstream: undefined },
      {
        stdout: (t) => output.push(t),
        stderr: () => {},
        clearToken: async () => { cleared = true; },
        loadToken: async () => ({ type: "oauth" as const, access: "some-token" }),
      },
    );
    expect(code).toBe(0);
    expect(cleared).toBe(true);
    expect(output.join("").toLowerCase()).toContain("logged out");
  });

  it("exits 0 and prints stable message when token already absent", async () => {
    const output: string[] = [];
    const code = await runLogout(
      { command: "logout", upstream: undefined },
      {
        stdout: (t) => output.push(t),
        stderr: () => {},
        clearToken: async () => {},
        loadToken: async () => null,
      },
    );
    expect(code).toBe(0);
    expect(output.join("").toLowerCase()).toMatch(/logged out|token already absent/);
  });
});

describe("createPrompts", () => {
  it("returns undefined callbacks when not interactive", () => {
    const prompts = createPrompts(false);
    expect(prompts.promptForEmail).toBeUndefined();
    expect(prompts.promptForOtp).toBeUndefined();
  });

  it("returns function callbacks when interactive", () => {
    const prompts = createPrompts(true);
    expect(typeof prompts.promptForEmail).toBe("function");
    expect(typeof prompts.promptForOtp).toBe("function");
  });
});
