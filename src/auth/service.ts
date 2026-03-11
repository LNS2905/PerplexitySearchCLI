export type AuthMode =
  | "cached"
  | "desktop-borrow"
  | "otp-interactive"
  | "otp-env"
  | "setup-error";

export interface AuthModeInput {
  hasStoredToken: boolean;
  isInteractive: boolean;
  platform: string;
  borrowDisabled?: boolean;
  hasEnvEmail?: boolean;
}

export async function getAuthMode(input: AuthModeInput): Promise<AuthMode> {
  if (input.hasStoredToken) {
    return "cached";
  }

  const isMac = input.platform === "darwin";
  const borrowDisabled = input.borrowDisabled ?? false;

  if (isMac && !borrowDisabled) {
    return "desktop-borrow";
  }

  if (input.isInteractive) {
    return "otp-interactive";
  }

  if (input.hasEnvEmail) {
    return "otp-env";
  }

  return "setup-error";
}
