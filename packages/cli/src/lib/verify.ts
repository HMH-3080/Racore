import { existsSync } from "node:fs";
import { join } from "node:path";
import { getShellArgv } from "./shell";

const VERIFY_TIMEOUT = 120_000;
const MAX_OUTPUT = 12_000;

function truncate(value: string) {
  return value.length > MAX_OUTPUT
    ? `${value.slice(0, MAX_OUTPUT)}\n... (truncated)`
    : value;
}

async function runVerifyCommand(command: string) {
  const proc = Bun.spawn(getShellArgv(command), {
    cwd: process.cwd(),
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env, TERM: "dumb", FORCE_COLOR: "0" },
  });

  const timer = setTimeout(() => proc.kill(), VERIFY_TIMEOUT);
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const exitCode = await proc.exited;
  clearTimeout(timer);

  return { ok: exitCode === 0, output: truncate([stdout, stderr].filter(Boolean).join("\n").trim()) };
}

export type VerificationReport = {
  typecheck?: { ok: boolean; output: string };
  lint?: { ok: boolean; output: string };
  skipped: string[];
  ok: boolean;
};

/**
 * Run post-edit verification: TypeScript typecheck and lint when the project
 * has them configured. Designed to be fed straight back into the agent loop
 * so it can self-correct.
 */
export async function verifyChanges(paths?: string[]): Promise<VerificationReport> {
  const cwd = process.cwd();
  const report: VerificationReport = { skipped: [], ok: true };

  if (existsSync(join(cwd, "tsconfig.json"))) {
    report.typecheck = await runVerifyCommand("bun x tsc --noEmit --pretty false");
    if (!report.typecheck.ok) report.ok = false;
  } else {
    report.skipped.push("typecheck (no tsconfig.json)");
  }

  const hasEslint = [
    "eslint.config.js",
    "eslint.config.mjs",
    "eslint.config.ts",
    ".eslintrc.json",
    ".eslintrc.js",
    ".eslintrc.cjs",
  ].some((file) => existsSync(join(cwd, file)));

  if (hasEslint) {
    const targets = paths && paths.length > 0 ? paths.map((path) => `"${path}"`).join(" ") : ".";
    report.lint = await runVerifyCommand(`bun x eslint ${targets} --no-color`);
    if (!report.lint.ok) report.ok = false;
  } else {
    report.skipped.push("lint (no eslint config)");
  }

  return report;
}
