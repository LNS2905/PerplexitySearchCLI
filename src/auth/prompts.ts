import { createInterface } from "node:readline";

export interface AuthPrompts {
  promptForEmail?: () => Promise<string>;
  promptForOtp?: () => Promise<string>;
}

function readLine(prompt: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stderr });
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

export function createPrompts(isInteractive: boolean): AuthPrompts {
  if (!isInteractive) {
    return {};
  }

  return {
    promptForEmail: () => readLine("Perplexity email: "),
    promptForOtp: () => readLine("Enter OTP code: "),
  };
}
