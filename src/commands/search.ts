import type { SearchCommand } from "../types.js";
import type { UpstreamAdapter, WrapperSearchResult } from "../upstream/contracts.js";
import type { StoredToken } from "../search/types.js";
import { EXIT_SUCCESS, EXIT_FAILURE, EXIT_AUTH_SETUP } from "../types.js";
import { UpstreamError } from "../upstream/contracts.js";
import { renderSearchOutput } from "../output/text.js";
import { renderJsonOutput } from "../output/json.js";

export interface SearchDeps {
  write: (text: string) => void;
  writeError: (text: string) => void;
  loadAdapter: (upstreamPath?: string) => Promise<UpstreamAdapter>;
  loadToken: () => Promise<StoredToken | null>;
}

export async function runSearch(cmd: SearchCommand, deps: SearchDeps): Promise<number> {
  let adapter: UpstreamAdapter;
  try {
    adapter = await deps.loadAdapter(cmd.upstream);
  } catch (e) {
    if (e instanceof UpstreamError) {
      deps.writeError(e.message + "\n");
      return EXIT_AUTH_SETUP;
    }
    deps.writeError(`Failed to load upstream: ${e instanceof Error ? e.message : String(e)}\n`);
    return EXIT_AUTH_SETUP;
  }

  let jwt: string;
  const cached = await deps.loadToken();
  if (cached) {
    jwt = cached.access;
  } else {
    try {
      const auth = await adapter.authenticate({});
      jwt = auth.access;
    } catch (e) {
      deps.writeError(`Authentication failed: ${e instanceof Error ? e.message : String(e)}\n`);
      return EXIT_AUTH_SETUP;
    }
  }

  let result: WrapperSearchResult;
  try {
    const params: { query: string; recency?: "hour" | "day" | "week" | "month" | "year"; limit?: number } = { query: cmd.query };
    if (cmd.recency !== undefined) params.recency = cmd.recency;
    if (cmd.limit !== undefined) params.limit = cmd.limit;
    result = await adapter.search(params, jwt);
  } catch (e) {
    deps.writeError(`Search failed: ${e instanceof Error ? e.message : String(e)}\n`);
    return EXIT_FAILURE;
  }

  if (cmd.format === "json") {
    const json = renderJsonOutput(result);
    deps.write(JSON.stringify(json, null, 2) + "\n");
  } else {
    const text = renderSearchOutput(result, (r) => adapter.format(r));
    deps.write(text + "\n");
  }

  return EXIT_SUCCESS;
}
