# R'a Core CLI

> A standalone terminal AI coding assistant — powered by OpenRouter, built with Bun, OpenTUI, and React.

[![npm version](https://img.shields.io/npm/v/@loai/racore-cli)](https://www.npmjs.com/package/@loai/racore-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Runtime](https://img.shields.io/badge/Runtime-Bun-%23f9f1d5)](https://bun.sh)

---
<img width="1912" height="975" alt="image" src="https://github.com/user-attachments/assets/df665be5-3315-40d6-93bd-822ead7e13fe" />

## Features

### Core Intelligence
- **AI-Generated Task Decomposition** — Tasks are created by the AI from your prompt, not hardcoded. Every prompt is split into real, parallel tasks with per-task completion signs (✅ / ⏳ / ❌)
- **Auto-Continue Engine** — The system **never stops** until every task is completed. An intent controller detects pending tasks and automatically continues working, then writes a Final Report when done
- **Intent Controller** — Smart task classification that detects task kind (bug, feature, refactor, docs, config, test, UI) and risk level, then builds an acceleration strategy with candidate files and verification commands
- **Three AI Modes** — `BUILD` (full tool access), `PLAN` (read-only analysis), `ULTRA` (parallel tools + sub-agents)
- **Project Intelligence** — Auto-indexes your workspace: symbols, imports, exports, headings
- **Affected Test Detection** — Finds related tests for your changes
- **Project Memory** — Remembers facts about your codebase across sessions

### Skills System
- **Skills** — Reusable expertise packs stored as markdown files with front-matter. The agent loads relevant skills automatically per task
- **Skill Auto-Injection** — Relevant skills are injected into the system prompt based on task context matching
- **Skill Creator** — After solving a novel, repeatable problem, save it with `createSkill` so future runs are faster
- **Skills Locations** — Project-level (`<project>/.racore/skills/*.md`) and user-level (`~/.racore/skills/*.md`)

### Speed & Performance
- **Speed Protocol** — Fast workspace context before broad exploration, parallel batch tools for compact progress
- **Parallel Batch Tools** — `readManyFiles` (12 files), `grepManyPatterns` (8 patterns), `writeManyFiles` (8 files)
- **Focused Verification** — Targeted typecheck and lint before wider commands
- **Model Auto-Fallback** — Automatic fallback to alternative models on failure via OpenRouter

### MCP Integration
- **MCP Tools** — Tools prefixed `mcp_` come from user-configured MCP servers
- **Domain Routing** — MCP tools are preferred for their domains (databases, browsers, issue trackers)
- **Local Tool Priority** — Local tools win on name clashes with MCP tools

### Developer Experience
- **OAuth Login** — One-click PKCE-based OpenRouter authentication via browser
- **Terminal UI** — Full React-based TUI with routing, dialogs, themes, and keyboard navigation
- **Local Sessions** — Persistent chat history stored per-session under `~/.racore/`
- **Multi-file Editing** — Batch read, write, edit, and patch operations
- **21+ Built-in Tools** — Read/search files, run commands, edit code, manage tasks, create skills, invoke sub-agents
- **32 Themes** — Nightfox, Catppuccin, Dracula, Tokyo Night, Nord, and many more
- **Auto-update** — Built-in `/update` command to self-update from npm
- **Reasoning Display** — See model thinking traces inline
- **Checkpoints** — Automatic snapshots before file edits with restore capability

---

## Quick Start

### Install

```bash
npm install -g @loai/racore-cli
```

### Run

```bash
racore
```

On first launch, the onboarding wizard guides you through:

1. **Choose a theme**
2. **Connect to OpenRouter** (OAuth or paste an API key)
3. **Start coding**

### Environment Variables (optional)

Create a `.env` file in your project directory:

```bash
OPENROUTER_API_KEY=sk-or-...
# or let the app manage auth via OAuth login
```

---

## Usage

### Headless Agent Mode

Run the full coding agent loop without the TUI:

```bash
racore run -p "fix the failing tests" --json
racore --headless --prompt-file prompt.md --mode ultra --yolo
echo "summarize this repo" | racore --stdin --json
racore "create a README for this package"
```

Headless mode uses the same model, MCP, permissions, file, git, shell, skills,
todo, verification, and auto-continue capabilities as the TUI. It exits with
`0` when the task completes, `1` on errors, and `2` if the auto-continue safety
limit is reached.

Useful options:

| Option | Description |
|---|---|
| `-p, --prompt <text>` | Prompt text |
| `-f, --prompt-file <path>` | Read prompt from a file |
| `--stdin` | Read prompt from stdin |
| `--cwd <path>` | Run from another project directory |
| `--provider <id>` | Select `openrouter`, `openai`, `anthropic`, `gemini`, or `ollama` |
| `--model <id>` | Override the configured model |
| `--mode <mode>` | `build`, `plan`, or `ultra` |
| `--session <id>` | Continue a specific saved session |
| `--continue` | Continue the most recent saved session |
| `--title <text>` | Title for a new session |
| `--json` | Emit machine-readable JSON with tokens, tool calls, and stop reason |
| `--output <path>` | Write final text or JSON to a file |
| `--max-rounds <n>` | Override the auto-continue round cap |
| `--no-stream` | Print only the final text in text mode |
| `--quiet` | Suppress stdout except errors/output file |
| `--yolo` | Auto-approve dangerous actions |

### Command Palette

Type `/` in the input bar to open the command menu:

| Command | Description |
|---|---|
| `/new` | Start a new conversation |
| `/config` | Open provider and model configuration |
| `/models` | Select the current provider model |
| `/agents` | Switch between BUILD / PLAN / ULTRA modes |
| `/sessions` | Browse past local sessions |
| `/theme` | Change color theme |
| `/releases` | Show version history and changelog |
| `/update` | Self-update the CLI from npm |
| `/compact` | Compact conversation context to save tokens |
| `/onboarding` | Show the onboarding wizard again |
| `/exit` | Quit the application |

### How Task Planning Works

When you submit a prompt, the system:

1. **Classifies** your intent (bug, feature, refactor, docs, config, test, UI) and risk level
2. **Creates a task plan** — the AI generates focused, verifiable tasks via `updateTodoList`
3. **Works through tasks** — each task is marked `in_progress` when started and `completed` with a result when done
4. **Auto-continues** — if tasks remain pending, the system automatically continues without stopping
5. **Writes a Final Report** — when all tasks are done, a summary of what was done, files changed, and verification results

The system **never asks for permission to continue** — it works until everything is done.

### Modes

| Mode | Tools | Use Case |
|---|---|---|
| `BUILD` | Read, write, edit, bash, skills, tasks | Full coding workflow |
| `PLAN` | Read-only (no writes) + skills | Code review, exploration |
| `ULTRA` | All tools + parallel ops + sub-agents | Complex multi-file refactors |

Switch modes via `/agents` or press `Tab` to cycle through them.

### Navigation

| Key | Action |
|---|---|
| `Tab` | Cycle modes |
| `Left` / `Right` | Switch between sidebar and chat |
| `Up` / `Down` | Navigate sidebar sessions |
| `Esc` | Interrupt model response |

---

## Tools (Built-in)

### File Operations
| Tool | Mode | Description |
|---|---|---|
| `readFile` | All | Read text files (max 10K chars) |
| `listDirectory` | All | List directory contents |
| `glob` | All | Glob pattern matching (max 200 results) |
| `grep` | All | Regex search (max 50 matches) |
| `readManyFiles` | All | Batch read up to 12 files |
| `grepManyPatterns` | All | Batch grep up to 8 patterns |
| `writeFile` | BUILD, ULTRA | Create or overwrite a file |
| `writeManyFiles` | ULTRA | Batch write up to 8 files |
| `editFile` | BUILD, ULTRA | Find-replace in a file |
| `patchFile` | BUILD, ULTRA | Apply up to 20 patches |

### Intelligence
| Tool | Mode | Description |
|---|---|---|
| `agentPlan` | PLAN, ULTRA | Classify task against repo index |
| `repoIndex` | PLAN, ULTRA | Get/refresh workspace index |
| `searchSymbols` | PLAN, ULTRA | Search exports and symbols |
| `affectedTests` | PLAN, ULTRA | Find related test files |
| `readProjectMemory` | ULTRA | Query project facts |
| `rememberProjectFact` | ULTRA | Store a project fact |

### Task Management
| Tool | Mode | Description |
|---|---|---|
| `updateTodoList` | All | Create or update task items with status |
| `getTodoList` | All | Get current task list and progress |

### Skills
| Tool | Mode | Description |
|---|---|---|
| `listSkills` | All | List available skills for project and user |
| `useSkill` | All | Load a skill's full instructions |
| `createSkill` | BUILD, ULTRA | Save a new skill after solving a problem |

### Execution & Verification
| Tool | Mode | Description |
|---|---|---|
| `bash` | BUILD, ULTRA | Run shell commands (30s timeout) |
| `invokeAI` | ULTRA | Spawn sub-agent for subtasks |
| `verifyChanges` | BUILD, ULTRA | Run typecheck and lint on changed files |

### Git
| Tool | Mode | Description |
|---|---|---|
| `gitStatus` | All | Get current branch and working tree status |
| `gitDiff` | All | Show staged or unstaged changes |
| `gitLog` | All | Show recent commits |
| `gitCommit` | BUILD, ULTRA | Stage and commit changes |

### Checkpoints
| Tool | Mode | Description |
|---|---|---|
| `listCheckpoints` | All | List restore points before agent edits |
| `restoreCheckpoint` | BUILD, ULTRA | Undo agent edits by restoring files |

### Web
| Tool | Mode | Description |
|---|---|---|
| `webFetch` | All | Fetch public URLs (docs, READMEs, changelogs) |

---

## System Prompt Architecture

The system prompt is built from four protocols that work together:

### Speed Protocol
- Use fast workspace context before broad exploration
- Prefer batch tools (`readManyFiles`, `grepManyPatterns`) for compact parallel progress
- Run focused verification before wider commands
- Use `gitStatus` and `gitDiff` to ground in the working tree

### Task Plan Protocol
- First action: call `getTodoList` to check existing tasks
- If plan is missing, create tasks with `updateTodoList` — never duplicate existing ones
- Keep each task focused on one verifiable deliverable
- Mark tasks `in_progress` when started, `completed` with a one-line result when done
- Batch independent reads and checks in parallel

### Completion Protocol
- **NEVER stop** while any task is pending or `in_progress`
- When ALL tasks are completed, write a Final Report (markdown heading)
- Do not ask for permission to continue

### Skills Protocol
- Apply injected skills immediately when they match the task
- Call `listSkills`/`useSkill` before improvising on known domains
- Save novel solutions with `createSkill` for future reuse
- Use MCP tools for their domains (databases, browsers, issue trackers)

---

## Configuration

Config is stored under `~/.racore/`:

| File | Purpose |
|---|---|
| `config.json` | Active provider, model, mode |
| `auth.json` | Provider API keys (separate from config) |
| `preferences.json` | Theme name, font size |
| `sessions/*.json` | Per-session chat history |
| `cache/*.index.json` | Repo index per project |
| `cache/*.memory.json` | Project memory facts |
| `skills/*.md` | User-level reusable skills |

Open the config panel in-app via `/config`.

### Skills Configuration

Skills are stored as markdown files with front-matter:

```markdown
---
name: deploy-frontend
description: Deploy the frontend to production
triggers: deploy, frontend, production, vercel
---

## Steps
1. Run `npm run build`
2. Run `vercel --prod`
3. Verify the deployment URL
```

**Locations** (project wins on name conflicts):
- `<project>/.racore/skills/*.md` — Project-level skills
- `~/.racore/skills/*.md` — User-level skills

### MCP Configuration

MCP servers can be configured to provide additional tools. Tools are prefixed with `mcp_` and are automatically available in non-PLAN modes.

---

## Development

### Setup

```bash
git clone https://github.com/loayabdalslam/racore.git
cd racore/packages/cli
npm install
```

### Run in dev mode (with file watching)

```bash
npm run dev
```

### Build

```bash
npm run build
```

Output goes to `packages/cli/dist/`.

### Test

```bash
npm test
```

Run a single test:

```bash
node ../../scripts/run-bun.mjs test src/lib/<file>.test.ts
```

---

## Architecture

```
bin/racore          ← Binary entry point (Bun shebang)
src/
├── index.tsx       ← App bootstrap + router
├── theme.ts        ← 32 theme definitions
├── screens/        ← Application screens (home, config, session, etc.)
├── components/     ← UI components (input bar, messages, dialogs, command menu)
├── providers/      ← React context providers (theme, dialog, keyboard, toast, prompt-config)
├── hooks/          ← React hooks (use-chat with auto-continue engine)
├── lib/            ← Core logic
│   ├── chat-service.ts       ← AI model orchestration + streaming + system prompt
│   ├── agent-accelerator.ts  ← Workspace indexing + intent classification + strategy
│   ├── local-tools.ts        ← 21+ built-in tool implementations
│   ├── tool-registry.ts      ← Mode-aware tool registry
│   ├── skills.ts             ← Skills system + skill creator
│   ├── todo-store.ts         ← Task list with reactive listeners
│   ├── config-store.ts       ← Config persistence
│   ├── provider-auth.ts      ← OAuth PKCE flow
│   ├── models.ts             ← Model definitions + capabilities
│   ├── session-store.ts      ← Session persistence
│   ├── checkpoint-store.ts   ← Edit snapshots + restore
│   ├── self-update.ts        ← npm update mechanism
│   ├── mcp.ts                ← MCP server integration
│   ├── app-schema.ts         ← Types + Zod schemas (21+ tool input schemas)
│   ├── app-paths.ts          ← File path constants
│   └── *.test.ts             ← Tests
└── layouts/        ← Root layout wrapper
```

### Tech Stack

| Layer | Technology |
|---|---|
| Runtime | [Bun](https://bun.sh) |
| UI Framework | [OpenTUI](https://github.com/opentui/opentui) (React in terminal) |
| AI SDK | [Vercel AI SDK](https://sdk.vercel.ai) |
| Models | [OpenRouter](https://openrouter.ai) (OAuth + API key) + Direct providers (Anthropic, Gemini, Ollama) |
| Routing | [React Router](https://reactrouter.com) |
| Validation | [Zod](https://zod.dev) |

### Available Models

| Model | Description |
|---|---|
| `qwen/qwen3-coder:free` | **Default** — Free coding model |
| `google/gemini-2.5-flash` | Fast default for low-latency coding |
| `openai/gpt-4o-mini` | Very fast for simple edits/chat |
| `openai/gpt-5` | Broad routing, unified billing (supports reasoning) |
| `anthropic/claude-sonnet-4` | Reliable code editing and analysis (supports reasoning) |

Models auto-refresh from OpenRouter when connected. Direct provider support includes Anthropic, Google Gemini, and Ollama.

---

## Themes

R'a Core ships with 32 carefully crafted dark themes:

Nightfox · Catppuccin Mocha · Dracula · Monokai Pro · Tokyo Night · Nord · Synthwave · Midnight Sky · Neon Nights · Hacker Terminal · One Dark · Xcode Midnight · Catppuccin Frappe · Vercel Dark · Material Ocean · Dusk · Ocean · Soft Midnight · Minimal Dark · Solarized Dark · Gruvbox Dark · Rosé Pine · Rosé Pine Moon · Kanagawa · Everforest Dark · Ayu Dark · GitHub Dark · Palenight · Vesper · Poimandres · Moonlight · Vitesse Dark

Change themes in-app via `/theme` or in the config panel. Three font sizes available: **Small**, **Medium**, **Large**.

---

## Publishing

```bash
# Bump version
npm version patch   # or minor / major

# Build + publish
npm publish --access public
```

---

## License

MIT
