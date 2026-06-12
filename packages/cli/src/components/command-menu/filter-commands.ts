import type { Command } from "./types";
import { COMMANDS } from "./commands";
import { listCustomCommands } from "../../lib/custom-commands";

function getAllCommands(): Command[] {
  const custom: Command[] = listCustomCommands()
    .filter((command) => !COMMANDS.some((builtin) => builtin.name === command.name))
    .map((command) => ({
      name: command.name,
      description: `Custom (${command.scope}): ${command.template.split("\n")[0]?.slice(0, 50) ?? ""}`,
      value: `/${command.name}`,
      // No action: selecting inserts "/name " so the user can add arguments.
    }));

  return [...COMMANDS, ...custom];
}

export function getFilteredCommands(query: string): Command[] {
  const all = getAllCommands();
  if (query.length === 0) return all;
  return all.filter((cmd) => cmd.name.toLowerCase().startsWith(query.toLowerCase()));
}

