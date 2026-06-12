import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";
import { homedir } from "node:os";
import { getShellArgv } from "./shell";

export type CustomCommand = {
  /** Slash-command name, derived from the file name (e.g. "review" for review.md). */
  name: string;
  /** Where the command came from: project or user scope. */
  scope: "project" | "user";
  /** Raw prompt template. Supports $ARGUMENTS substitution. */
  template: string;
};

export type ProjectHooks = {
  /** Shell command executed after every successful file write/edit/patch. */
  postWrite?: string;
};

type ProjectSettings = {
  hooks?: ProjectHooks;
};

function commandsIn(dir: string, scope: CustomCommand["scope"]): CustomCommand[] {
  if (!existsSync(dir)) return [];

  try {
    return readdirSync(dir)
      .filter((file) => file.endsWith(".md"))
      .map((file) => ({
        name: basename(file, ".md"),
        scope,
        template: readFileSync(join(dir, file), "utf8"),
      }));
  } catch {
    return [];
  }
}

const CACHE_TTL_MS = 3_000;
let cachedCommands: { at: number; commands: CustomCommand[] } | null = null;

/**
 * Load user-defined slash commands from:
 * - <project>/.racore/commands/*.md (project scope, wins on conflicts)
 * - ~/.racore/commands/*.md (user scope)
 * Results are briefly cached because the command menu calls this per keystroke.
 */
export function listCustomCommands(): CustomCommand[] {
  if (cachedCommands && Date.now() - cachedCommands.at < CACHE_TTL_MS) {
    return cachedCommands.commands;
  }

  const project = commandsIn(join(process.cwd(), ".racore", "commands"), "project");
  const user = commandsIn(join(homedir(), ".racore", "commands"), "user");

  const seen = new Set(project.map((command) => command.name));
  const commands = [...project, ...user.filter((command) => !seen.has(command.name))];
  cachedCommands = { at: Date.now(), commands };
  return commands;
}

/** Expand a custom command template with the user's arguments. */
export function resolveCustomCommand(name: string, args: string): string | null {
  const command = listCustomCommands().find((candidate) => candidate.name === name);
  if (!command) return null;

  return command.template.includes("$ARGUMENTS")
    ? command.template.replaceAll("$ARGUMENTS", args)
    : [command.template, args].filter(Boolean).join("\n\n");
}

function loadProjectSettings(): ProjectSettings {
  const settingsPath = join(process.cwd(), ".racore", "settings.json");
  if (!existsSync(settingsPath)) return {};

  try {
    return JSON.parse(readFileSync(settingsPath, "utf8")) as ProjectSettings;
  } catch {
    return {};
  }
}

/**
 * Best-effort post-write hook (e.g. a formatter). Failures never break the
 * agent loop; the hook output is returned for visibility only.
 */
export async function runPostWriteHook(relPath: string): Promise<string | null> {
  const hook = loadProjectSettings().hooks?.postWrite;
  if (!hook) return null;

  try {
    const command = hook.replaceAll("$FILE", relPath);
    const proc = Bun.spawn(getShellArgv(command), {
      cwd: process.cwd(),
      stdout: "pipe",
      stderr: "pipe",
      env: { ...process.env, TERM: "dumb" },
    });
    const timer = setTimeout(() => proc.kill(), 10_000);
    await proc.exited;
    clearTimeout(timer);
    return command;
  } catch {
    return null;
  }
}
