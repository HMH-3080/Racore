# R'a Core Internship Benchmark

This package turns `racore` headless mode into a daily-work benchmark for a junior or amateur software engineer.

## What Is Inside

- `benchmarks/tasks.json`: 30 realistic daily SWE tasks
- `scripts/run-benchmark.mjs`: Headless runner and report generator
- `reports/latest.md`: Latest benchmark summary

## Coverage

The tasks cover:

- Coding
- Fix bug
- Add feature
- Write API
- Refactor code
- Terminal
- Git operations
- Docker
- Linux commands
- Package installation
- Research
- Read docs
- Generate report
- Agentic
- Create project from prompt
- Run tests
- Fix failures
- Commit changes

## Run Locally

Build the CLI first from the repo root:

```bash
npm run build:cli
```

Run the benchmark package:

```bash
cd "packages/racrore intrenship benchmark"
node scripts/run-benchmark.mjs --limit 5
```

## Live Headless Workflow

The runner uses the real `racore` CLI in headless mode through the local bin:

```bash
bun packages/cli/bin/racore run --json --quiet --yolo -p "your task"
```

Useful environment variables:

```bash
BENCHMARK_TARGET_CWD=/path/to/project
RACORE_PROVIDER=openrouter
RACORE_MODEL=openai/gpt-5
RACORE_MODE=build
RACORE_PRICE_INPUT_PER_1M=1.25
RACORE_PRICE_OUTPUT_PER_1M=10
```

## Output

Each run writes:

- JSON task outputs into `reports/results/`
- aggregate JSON into `reports/summary.json`
- a human-readable markdown report into `reports/latest.md`
