import type { StatusInfo } from "../types.js";

export function formatStatusOutput(info: StatusInfo): string {
  return `bun: ${info.bun}\nupstream: ${info.upstream}\ntoken: ${info.token}\ninteractive: ${info.interactive}`;
}
