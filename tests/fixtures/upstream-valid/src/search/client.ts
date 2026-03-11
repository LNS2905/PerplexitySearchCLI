export interface SearchParams {
  query: string;
  recency?: "hour" | "day" | "week" | "month" | "year";
  limit?: number;
}

export async function searchPerplexity(
  params: SearchParams,
  _jwt: string,
  _signal?: AbortSignal,
): Promise<{ answer: string; sources: Array<{ name?: string; url?: string; snippet?: string; timestamp?: string }>; displayModel?: string; uuid?: string }> {
  return {
    answer: `Fixture answer for: ${params.query}`,
    sources: [{ name: "Example", url: "https://example.com", snippet: "A snippet" }],
    displayModel: "fixture-model",
    uuid: "fixture-uuid",
  };
}
