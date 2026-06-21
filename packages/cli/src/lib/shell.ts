import { existsSync } from "node:fs";

const GIT_BASH_CANDIDATES = [
  "C:\\Program Files\\Git\\bin\\bash.exe",
  "C:\\Program Files (x86)\\Git\\bin\\bash.exe",
];

let cachedWindowsShell: string[] | null = null;

function resolveWindowsShell(): string[] {
  if (cachedWindowsShell) return cachedWindowsShell;

  for (const candidate of GIT_BASH_CANDIDATES) {
    if (existsSync(candidate)) {
      cachedWindowsShell = [candidate, "-c"];
      return cachedWindowsShell;
    }
  }

  cachedWindowsShell = ["powershell.exe", "-NoProfile", "-NonInteractive", "-Command"];
  return cachedWindowsShell;
}

/**
 * Build a platform-appropriate argv for executing a shell command string.
 * Prefers bash everywhere (Git Bash on Windows) and falls back to PowerShell.
 */
export function getShellArgv(command: string): string[] {
  if (process.platform === "win32") {
    return [...resolveWindowsShell(), command];
  }
  return ["bash", "-c", command];
}

/** Build argv for Windows Command Prompt (cmd.exe) */
export function getCmdArgv(command: string): string[] {
  return ["cmd.exe", "/c", command];
}

/** Build argv for PowerShell */
export function getPowerShellArgv(command: string): string[] {
  return ["powershell.exe", "-NoProfile", "-NonInteractive", "-Command", command];
}

/** Human-readable name of the shell that will execute commands. */
export function getShellName(): string {
  if (process.platform !== "win32") return "bash";
  return resolveWindowsShell()[0]!.includes("bash") ? "git-bash" : "powershell";
}
