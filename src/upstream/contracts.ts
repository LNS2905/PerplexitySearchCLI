export interface WrapperSearchParams {
  query: string;
  recency?: "hour" | "day" | "week" | "month" | "year";
  limit?: number;
}

export interface WrapperAuthOptions {
  promptForEmail?: () => Promise<string>;
  promptForOtp?: () => Promise<string>;
}

export interface WrapperSearchResult {
  answer: string;
  sources: Array<{ title?: string; url: string; snippet?: string; date?: string }>;
  displayModel?: string;
  uuid?: string;
}

export interface UpstreamAdapter {
  authenticate(options: WrapperAuthOptions): Promise<{ type: "oauth"; access: string }>;
  search(params: WrapperSearchParams, jwt: string, signal?: AbortSignal): Promise<WrapperSearchResult>;
  format(result: WrapperSearchResult): string;
}

export interface UpstreamModulePaths {
  auth: string;
  search: string;
  format: string;
}

export class UpstreamError extends Error {
  exitCode: number;
  constructor(message: string, exitCode: number = 2) {
    super(message);
    this.name = "UpstreamError";
    this.exitCode = exitCode;
  }
}
