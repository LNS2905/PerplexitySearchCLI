import type { WrapperSearchResult } from "../upstream/contracts.js";

export interface JsonOutput {
  answer: string;
  sources: Array<{ title?: string; url: string; snippet?: string; date?: string }>;
  meta: {
    displayModel?: string;
    uuid?: string;
  };
}

export function renderJsonOutput(result: WrapperSearchResult): JsonOutput {
  const meta: { displayModel?: string; uuid?: string } = {};
  if (result.displayModel !== undefined) meta.displayModel = result.displayModel;
  if (result.uuid !== undefined) meta.uuid = result.uuid;
  return {
    answer: result.answer,
    sources: result.sources,
    meta,
  };
}
