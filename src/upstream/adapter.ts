import type { UpstreamAdapter, WrapperSearchParams, WrapperAuthOptions, WrapperSearchResult } from "./contracts.js";
import { UpstreamError } from "./contracts.js";
import { resolveUpstreamModules } from "./resolve.js";

export async function loadUpstreamAdapter(root: string): Promise<UpstreamAdapter> {
  const paths = await resolveUpstreamModules({ root });

  let authModule: Record<string, unknown>;
  let searchModule: Record<string, unknown>;
  let formatModule: Record<string, unknown>;

  try {
    authModule = await import(paths.auth);
  } catch (e) {
    throw new UpstreamError(
      `Failed to import upstream auth module at ${paths.auth}: ${e instanceof Error ? e.message : String(e)}`,
    );
  }

  try {
    searchModule = await import(paths.search);
  } catch (e) {
    throw new UpstreamError(
      `Failed to import upstream search module at ${paths.search}: ${e instanceof Error ? e.message : String(e)}`,
    );
  }

  try {
    formatModule = await import(paths.format);
  } catch (e) {
    throw new UpstreamError(
      `Failed to import upstream format module at ${paths.format}: ${e instanceof Error ? e.message : String(e)}`,
    );
  }

  const authenticate = authModule["authenticate"];
  if (typeof authenticate !== "function") {
    throw new UpstreamError(
      `missing export: upstream auth module does not export 'authenticate' function`,
    );
  }

  const searchPerplexity = searchModule["searchPerplexity"];
  if (typeof searchPerplexity !== "function") {
    throw new UpstreamError(
      `missing export: upstream search module does not export 'searchPerplexity' function`,
    );
  }

  const formatForLLM = formatModule["formatForLLM"];
  if (typeof formatForLLM !== "function") {
    throw new UpstreamError(
      `missing export: upstream format module does not export 'formatForLLM' function`,
    );
  }

  return {
    async authenticate(options: WrapperAuthOptions): Promise<{ type: "oauth"; access: string }> {
      const token = await (authenticate as Function)({
        promptForEmail: options.promptForEmail
          ? async () => options.promptForEmail!()
          : undefined,
        promptForOtp: options.promptForOtp
          ? async (_email: string) => options.promptForOtp!()
          : undefined,
      });
      return { type: "oauth", access: token as string };
    },

    async search(params: WrapperSearchParams, jwt: string, signal?: AbortSignal): Promise<WrapperSearchResult> {
      const result = await (searchPerplexity as Function)(
        { query: params.query, recency: params.recency, limit: params.limit },
        jwt,
        signal,
      );
      const raw = result as Record<string, unknown>;
      const sources = Array.isArray(raw.sources)
        ? raw.sources.map((s: Record<string, unknown>) => {
            const entry: { title?: string; url: string; snippet?: string; date?: string } = {
              url: typeof s.url === "string" ? s.url : "",
            };
            if (typeof s.name === "string") entry.title = s.name;
            if (typeof s.snippet === "string") entry.snippet = s.snippet;
            if (typeof s.timestamp === "string") entry.date = s.timestamp;
            return entry;
          })
        : [];
      const out: WrapperSearchResult = {
        answer: typeof raw.answer === "string" ? raw.answer : "",
        sources,
      };
      if (typeof raw.displayModel === "string") out.displayModel = raw.displayModel;
      if (typeof raw.uuid === "string") out.uuid = raw.uuid;
      return out;
    },

    format(result: WrapperSearchResult): string {
      const upstreamResult = {
        answer: result.answer,
        sources: result.sources.map((s) => ({
          name: s.title,
          url: s.url,
          snippet: s.snippet,
          timestamp: s.date,
        })),
        displayModel: result.displayModel,
        uuid: result.uuid,
      };
      return (formatForLLM as Function)(upstreamResult) as string;
    },
  };
}
