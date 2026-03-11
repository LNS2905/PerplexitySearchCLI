export interface AuthenticateOptions {
  signal?: AbortSignal;
  promptForEmail?: () => Promise<string | null | undefined>;
  promptForOtp?: (email: string) => Promise<string | null | undefined>;
}

export async function authenticate(_options: AuthenticateOptions = {}): Promise<string> {
  return "fixture-jwt-token";
}
