import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(__dirname, "..");
const repoRoot = resolve(packageRoot, "..", "..");
const tasksPath = join(packageRoot, "benchmarks", "tasks.json");
const reportsDir = join(packageRoot, "reports");
const resultsDir = join(reportsDir, "results");
const latestSummaryPath = join(reportsDir, "summary.json");
const latestReportPath = join(reportsDir, "latest.md");
const defaultCliBin = resolve(repoRoot, "packages", "cli", "bin", "racore");

mkdirSync(resultsDir, { recursive: true });

function printHelp() {
  console.log("R'a Core Internship Benchmark");
  console.log("");
  console.log("Usage:");
  console.log("  node scripts/run-benchmark.mjs");
  console.log("  node scripts/run-benchmark.mjs --limit 5");
  console.log("  node scripts/run-benchmark.mjs --task task-01-coding-login-form");
  console.log("  node scripts/run-benchmark.mjs --report-only");
  console.log("");
  console.log("Environment:");
  console.log("  BENCHMARK_TARGET_CWD              Project directory to benchmark");
  console.log("  RACORE_MODEL                      Model id, e.g. openai/gpt-5");
  console.log("  RACORE_PROVIDER                   Provider id, default openrouter");
  console.log("  RACORE_MODE                       build | plan | ultra");
  console.log("  RACORE_RUNTIME                    Runtime used to invoke the local CLI, default bun");
  console.log("  RACORE_BIN                        Path to racore bin, default packages/cli/bin/racore");
  console.log("  RACORE_PRICE_INPUT_PER_1M         Optional cost estimate for input tokens");
  console.log("  RACORE_PRICE_OUTPUT_PER_1M        Optional cost estimate for output tokens");
}

function parseArgs(argv) {
  const args = {
    limit: null,
    task: null,
    reportOnly: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") args.help = true;
    if (arg === "--report-only") args.reportOnly = true;
    if (arg === "--limit") args.limit = Number(argv[index + 1] ?? 0);
    if (arg === "--task") args.task = argv[index + 1] ?? null;
    if (arg === "--limit" || arg === "--task") index += 1;
  }

  return args;
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function loadTasks() {
  return readJson(tasksPath);
}

function formatDuration(durationMs) {
  const totalSeconds = Math.round(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
}

function round(value, digits = 2) {
  return Number(value.toFixed(digits));
}

function estimateCost(inputTokens, outputTokens) {
  const inputRate = Number(process.env.RACORE_PRICE_INPUT_PER_1M ?? 0);
  const outputRate = Number(process.env.RACORE_PRICE_OUTPUT_PER_1M ?? 0);
  const inputCost = (inputTokens / 1_000_000) * inputRate;
  const outputCost = (outputTokens / 1_000_000) * outputRate;
  return inputCost + outputCost;
}

function getRuntimeConfig() {
  return {
    targetCwd: process.env.BENCHMARK_TARGET_CWD ?? repoRoot,
    provider: process.env.RACORE_PROVIDER ?? "openrouter",
    model: process.env.RACORE_MODEL ?? "openai/gpt-5",
    mode: process.env.RACORE_MODE ?? "build",
    runtime: process.env.RACORE_RUNTIME ?? "bun",
    cliBin: process.env.RACORE_BIN ?? defaultCliBin,
  };
}

function loadExistingResults() {
  if (!existsSync(resultsDir)) return [];

  return readdirSync(resultsDir)
    .filter((file) => file.endsWith(".json"))
    .map((file) => readJson(join(resultsDir, file)));
}

function renderReport(summary) {
  const lines = [
    "# R'a Core Internship Benchmark Report",
    "",
    "## Snapshot",
    `- Success Rate: ${summary.successRate}%`,
    `- Average Time: ${summary.averageTime}`,
    `- Average Cost: $${summary.averageCost}`,
    `- Model Name: ${summary.modelName}`,
    `- Provider: ${summary.provider}`,
    `- Mode: ${summary.mode}`,
    `- Total Tasks: ${summary.totalTasks}`,
    `- Passed: ${summary.passedTasks}`,
    `- Failed: ${summary.failedTasks}`,
    "",
    "## Notes",
    "- This benchmark is designed to feel like a daily workload for an amateur or junior SWE engineer.",
    "- Tasks cover coding, bug fixing, APIs, refactors, terminal usage, git, Docker, Linux-style shell work, package setup, research, docs, reporting, tests, and agentic multi-step execution.",
    "- Cost is estimated from token counts only when pricing env vars are provided.",
    "",
    "## Task Results",
    "| Task | Category | Status | Time | Cost |",
    "|---|---|---|---:|---:|",
    ...summary.tasks.map(
      (task) =>
        `| ${task.id} | ${task.category} | ${task.ok ? "pass" : "fail"} | ${formatDuration(task.durationMs)} | $${task.estimatedCost} |`,
    ),
  ];

  return `${lines.join("\n")}\n`;
}

function createSummary(taskResults, runtimeConfig) {
  const totalTasks = taskResults.length;
  const passedTasks = taskResults.filter((task) => task.ok).length;
  const failedTasks = totalTasks - passedTasks;
  const successRate = totalTasks === 0 ? 0 : round((passedTasks / totalTasks) * 100, 0);
  const averageDurationMs =
    totalTasks === 0 ? 0 : taskResults.reduce((sum, task) => sum + task.durationMs, 0) / totalTasks;
  const averageCostValue =
    totalTasks === 0 ? 0 : taskResults.reduce((sum, task) => sum + task.estimatedCost, 0) / totalTasks;

  return {
    generatedAt: new Date().toISOString(),
    totalTasks,
    passedTasks,
    failedTasks,
    successRate,
    averageTime: formatDuration(averageDurationMs),
    averageCost: round(averageCostValue, 2).toFixed(2),
    provider: runtimeConfig.provider,
    modelName: runtimeConfig.model,
    mode: runtimeConfig.mode,
    tasks: taskResults,
  };
}

function persistSummary(summary) {
  writeFileSync(latestSummaryPath, JSON.stringify(summary, null, 2), "utf8");
  writeFileSync(latestReportPath, renderReport(summary), "utf8");
}

function runCliTask(task, runtimeConfig) {
  const outputPath = join(resultsDir, `${task.id}.json`);
  const args = [
    runtimeConfig.cliBin,
    "run",
    "--json",
    "--quiet",
    "--yolo",
    "--provider",
    runtimeConfig.provider,
    "--model",
    runtimeConfig.model,
    "--mode",
    runtimeConfig.mode,
    "--cwd",
    runtimeConfig.targetCwd,
    "--output",
    outputPath,
    "--title",
    task.title,
    "-p",
    task.prompt,
  ];

  return new Promise((resolve) => {
    const startedAt = Date.now();
    const child = spawn(runtimeConfig.runtime, args, {
      cwd: repoRoot,
      stdio: "inherit",
      env: process.env,
    });

    child.on("exit", (code) => {
      let payload = {};
      if (existsSync(outputPath)) {
        try {
          payload = readJson(outputPath);
        } catch {
          payload = {};
        }
      }

      const durationMs = Date.now() - startedAt;
      const inputTokens = Number(payload.inputTokens ?? 0);
      const outputTokens = Number(payload.outputTokens ?? 0);
      const estimatedCost = round(estimateCost(inputTokens, outputTokens), 4);

      resolve({
        id: task.id,
        title: task.title,
        category: task.category,
        ok: code === 0 && payload.ok === true,
        exitCode: code ?? 1,
        durationMs,
        estimatedCost,
        inputTokens,
        outputTokens,
        totalTokens: Number(payload.totalTokens ?? 0),
        provider: payload.provider ?? runtimeConfig.provider,
        model: payload.model ?? runtimeConfig.model,
        stopReason: payload.stopReason ?? "unknown",
        outputFile: outputPath,
      });
    });
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    process.exit(0);
  }

  const runtimeConfig = getRuntimeConfig();

  if (args.reportOnly) {
    const existingResults = loadExistingResults();
    const summary = createSummary(existingResults, runtimeConfig);
    persistSummary(summary);
    console.log(`Report written to ${latestReportPath}`);
    process.exit(0);
  }

  let tasks = loadTasks();
  if (args.task) tasks = tasks.filter((task) => task.id === args.task);
  if (Number.isInteger(args.limit) && args.limit > 0) tasks = tasks.slice(0, args.limit);

  if (tasks.length === 0) {
    console.error("No benchmark tasks selected.");
    process.exit(1);
  }

  const results = [];
  for (const task of tasks) {
    console.log(`\n[benchmark] Running ${task.id} - ${task.title}`);
    const result = await runCliTask(task, runtimeConfig);
    results.push(result);
    console.log(
      `[benchmark] ${task.id} => ${result.ok ? "pass" : "fail"} in ${formatDuration(result.durationMs)} ($${result.estimatedCost})`,
    );
  }

  const summary = createSummary(results, runtimeConfig);
  persistSummary(summary);

  console.log("\nBenchmark complete.");
  console.log(`Success Rate: ${summary.successRate}%`);
  console.log(`Average Time: ${summary.averageTime}`);
  console.log(`Average Cost: $${summary.averageCost}`);
  console.log(`Model Name: ${summary.modelName}`);
  console.log(`Report: ${latestReportPath}`);
}

await main();
