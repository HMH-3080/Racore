import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { delimiter, join } from "node:path";
import { spawnSync } from "node:child_process";

const commandName = process.platform === "win32" ? "bun.exe" : "bun";
const home = homedir();
const candidates = [
  commandName,
  join(home, ".bun", "bin", commandName),
  join(home, "AppData", "Roaming", "npm", commandName),
];

function canRun(command) {
  if (command === commandName) {
    const result = spawnSync(command, ["--version"], { stdio: "ignore", shell: false });
    return !result.error && result.status === 0;
  }

  return existsSync(command);
}

const bun = candidates.find(canRun);

if (!bun) {
  console.error("Bun was not found. Install Bun or add it to PATH, then retry.");
  process.exit(1);
}

const env = {
  ...process.env,
  PATH: [join(home, ".bun", "bin"), process.env.PATH ?? ""].join(delimiter),
};

const result = spawnSync(bun, process.argv.slice(2), {
  stdio: "inherit",
  shell: false,
  env,
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 0);
