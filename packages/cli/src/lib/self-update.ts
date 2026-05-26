import { CLI_PACKAGE_NAME } from "./app-info";
import { checkForNpmUpdate } from "./npm-updates";

type SelfUpdateResult = {
  ok: boolean;
  message: string;
};

function getNpmExecutable() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

export async function performSelfUpdate(): Promise<SelfUpdateResult> {
  const updateInfo = await checkForNpmUpdate();
  if (!updateInfo) {
    return {
      ok: false,
      message: "Unable to reach npm right now.",
    };
  }

  if (!updateInfo.shouldUpdate) {
    return {
      ok: true,
      message: `R'a Core is already up to date (${updateInfo.currentVersion}).`,
    };
  }

  const proc = Bun.spawn(
    [getNpmExecutable(), "install", "-g", `${CLI_PACKAGE_NAME}@${updateInfo.latestVersion}`],
    {
      stdout: "pipe",
      stderr: "pipe",
      env: {
        ...process.env,
        npm_config_update_notifier: "false",
      },
    },
  );

  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const exitCode = await proc.exited;

  if (exitCode !== 0) {
    return {
      ok: false,
      message: stderr.trim() || stdout.trim() || "npm update failed.",
    };
  }

  return {
    ok: true,
    message: `Updated R'a Core to ${updateInfo.latestVersion}. Restart the CLI to use the new version.`,
  };
}
