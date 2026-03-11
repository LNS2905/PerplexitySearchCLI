export type Recency = "hour" | "day" | "week" | "month" | "year";

export interface SearchCommand {
  command: "search";
  query: string;
  recency: Recency | undefined;
  limit: number | undefined;
  format: "text" | "json";
  upstream: string | undefined;
}

export interface LoginCommand {
  command: "login";
  force: boolean;
  upstream: string | undefined;
}

export interface LogoutCommand {
  command: "logout";
  upstream: string | undefined;
}

export interface StatusCommand {
  command: "status";
  upstream: string | undefined;
}

export interface HelpCommand {
  command: "help";
}

export interface ErrorCommand {
  command: "error";
  message: string;
  exitCode: number;
}

export type ParsedCommand =
  | SearchCommand
  | LoginCommand
  | LogoutCommand
  | StatusCommand
  | HelpCommand
  | ErrorCommand;

export const EXIT_SUCCESS = 0;
export const EXIT_FAILURE = 1;
export const EXIT_AUTH_SETUP = 2;
export const EXIT_USAGE = 64;

export interface StatusInfo {
  bun: "available" | "missing";
  upstream: "ready" | "missing";
  token: "present" | "missing";
  interactive: "yes" | "no";
}
