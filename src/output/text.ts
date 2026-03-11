import type { WrapperSearchResult } from "../upstream/contracts.js";

export function renderSearchOutput(
  result: WrapperSearchResult,
  adapterFormat?: (result: WrapperSearchResult) => string,
): string {
  if (adapterFormat) {
    return adapterFormat(result);
  }

  const sourceSection =
    result.sources.length === 0
      ? "0 sources\n(no sources returned)"
      : `${result.sources.length} sources\n${result.sources
          .map((s, i) => {
            const lines = [`[${i + 1}] ${s.title ?? "Untitled source"}`];
            if (s.url) lines.push(`    ${s.url}`);
            if (s.snippet) lines.push(`    ${s.snippet}`);
            return lines.join("\n");
          })
          .join("\n\n")}`;

  const metaLines = [
    "Provider: perplexity (oauth)",
    `Model: ${result.displayModel ?? "unknown"}`,
  ];
  if (result.uuid) metaLines.push(`Request ID: ${result.uuid}`);

  return [
    "## Answer",
    result.answer.trim() || "No answer returned.",
    "",
    "## Sources",
    sourceSection,
    "",
    "## Meta",
    ...metaLines,
  ].join("\n");
}
