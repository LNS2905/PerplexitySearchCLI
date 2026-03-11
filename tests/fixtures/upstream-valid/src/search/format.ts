export function formatForLLM(
  result: { answer: string; sources: Array<{ name?: string; url?: string; snippet?: string; timestamp?: string }>; displayModel?: string; uuid?: string },
  _limit?: number,
): string {
  return `## Answer\n${result.answer}\n\n## Sources\n${result.sources.length} sources\n\n## Meta\nProvider: perplexity (oauth)\nModel: ${result.displayModel ?? "unknown"}`;
}
