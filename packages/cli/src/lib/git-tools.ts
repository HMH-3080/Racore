const MAX_GIT_OUTPUT = 20_000;
const GIT_TIMEOUT = 30_000;

function truncate(value: string, limit = MAX_GIT_OUTPUT) {
  return value.length > limit
    ? `${value.slice(0, limit)}\n... (truncated, ${value.length} total chars)`
    : value;
}

async function runGit(args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const proc = Bun.spawn(["git", ...args], {
    cwd: process.cwd(),
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
  });

  const timer = setTimeout(() => proc.kill(), GIT_TIMEOUT);
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const exitCode = await proc.exited;
  clearTimeout(timer);

  return { stdout, stderr, exitCode };
}

async function requireGitRepo() {
  const { exitCode } = await runGit(["rev-parse", "--is-inside-work-tree"]);
  if (exitCode !== 0) {
    throw new Error("Not a git repository");
  }
}

export async function gitStatus() {
  await requireGitRepo();
  const [status, branch] = await Promise.all([
    runGit(["status", "--porcelain=v1"]),
    runGit(["branch", "--show-current"]),
  ]);

  const files = status.stdout
    .split("\n")
    .filter(Boolean)
    .map((line) => ({ status: line.slice(0, 2).trim(), path: line.slice(3) }));

  return {
    branch: branch.stdout.trim() || "(detached)",
    clean: files.length === 0,
    files,
  };
}

export async function gitDiff(options: { staged?: boolean; path?: string }) {
  await requireGitRepo();
  const args = ["diff", "--no-color"];
  if (options.staged) args.push("--cached");
  if (options.path) args.push("--", options.path);

  const { stdout, stderr, exitCode } = await runGit(args);
  if (exitCode !== 0) throw new Error(`git diff failed: ${stderr.trim()}`);

  return {
    diff: truncate(stdout) || "(no changes)",
  };
}

export async function gitLog(options: { limit?: number }) {
  await requireGitRepo();
  const limit = Math.min(Math.max(options.limit ?? 10, 1), 50);
  const { stdout, stderr, exitCode } = await runGit([
    "log",
    `-${limit}`,
    "--no-color",
    "--pretty=format:%h|%an|%ad|%s",
    "--date=short",
  ]);
  if (exitCode !== 0) throw new Error(`git log failed: ${stderr.trim()}`);

  return {
    commits: stdout
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const [hash, author, date, ...subject] = line.split("|");
        return { hash, author, date, subject: subject.join("|") };
      }),
  };
}

export async function gitCommit(options: { message: string; paths?: string[]; stageAll?: boolean }) {
  await requireGitRepo();

  if (!options.message.trim()) {
    throw new Error("Commit message must not be empty");
  }

  if (options.paths && options.paths.length > 0) {
    const add = await runGit(["add", "--", ...options.paths]);
    if (add.exitCode !== 0) throw new Error(`git add failed: ${add.stderr.trim()}`);
  } else if (options.stageAll) {
    const add = await runGit(["add", "-A"]);
    if (add.exitCode !== 0) throw new Error(`git add failed: ${add.stderr.trim()}`);
  }

  const staged = await runGit(["diff", "--cached", "--name-only"]);
  const stagedFiles = staged.stdout.split("\n").filter(Boolean);
  if (stagedFiles.length === 0) {
    throw new Error("Nothing staged to commit. Pass paths or stageAll: true.");
  }

  const commit = await runGit(["commit", "-m", options.message]);
  if (commit.exitCode !== 0) {
    throw new Error(`git commit failed: ${(commit.stderr || commit.stdout).trim()}`);
  }

  const hash = await runGit(["rev-parse", "--short", "HEAD"]);
  return {
    success: true as const,
    hash: hash.stdout.trim(),
    filesCommitted: stagedFiles,
    summary: truncate(commit.stdout, 2_000),
  };
}
