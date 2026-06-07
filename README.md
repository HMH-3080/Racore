# R'a Core CLI

> A standalone terminal AI coding assistant — powered by OpenRouter, built with Bun, OpenTUI, and React.

[![npm version](https://img.shields.io/npm/v/@loai/racore-cli)](https://www.npmjs.com/package/@loai/racore-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Runtime](https://img.shields.io/badge/Runtime-Bun-%23f9f1d5)](https://bun.sh)

---

## Features

- **Three AI Modes** — `BUILD` (full tool access), `PLAN` (read-only analysis), `ULTRA` (parallel tools + sub-agents)
- **OpenRouter Integration** — Choose from 5+ models with auto-fallback on failure
- **OAuth Login** — One-click PKCE-based OpenRouter authentication via browser
- **Terminal UI** — Full React-based TUI with routing, dialogs, themes, and keyboard navigation
- **Local Sessions** — Persistent chat history stored per-session under `~/.racore/`
- **Project Intelligence** — Auto-indexes your workspace: symbols, imports, exports, headings
- **Affected Test Detection** — Finds related tests for your changes
- **Project Memory** — Remembers facts about your codebase across sessions
- **Multi-file Editing** — Batch read, write, edit, and patch operations
- **18 Built-in Tools** — Read/search files, run commands, edit code, invoke sub-agents
- **32 Themes** — Nightfox, Catppuccin, Dracula, Tokyo Night, Nord, and many more
- **Auto-update** — Built-in `/update` command to self-update from npm
- **Reasoning Display** — See model thinking traces inline

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
| `/onboarding` | Show the onboarding wizard again |
| `/exit` | Quit the application |

### Modes

| Mode | Tools | Use Case |
|---|---|---|
| `BUILD` | Read, write, edit, bash | Full coding workflow |
| `PLAN` | Read-only (no writes) | Code review, exploration |
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

Open the config panel in-app via `/config`.

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
├── lib/            ← Core logic
│   ├── chat-service.ts     ← AI model orchestration + streaming
│   ├── agent-accelerator.ts ← Workspace indexing + strategy generation
│   ├── local-tools.ts      ← 18 built-in tool implementations
│   ├── config-store.ts     ← Config persistence
│   ├── provider-auth.ts    ← OAuth PKCE flow
│   ├── models.ts           ← Model definitions + capabilities
│   ├── session-store.ts    ← Session persistence
│   ├── self-update.ts      ← npm update mechanism
│   ├── app-schema.ts       ← Types + Zod schemas
│   ├── app-paths.ts        ← File path constants
│   └── *.test.ts           ← Tests
└── layouts/        ← Root layout wrapper
```

### Tech Stack

| Layer | Technology |
|---|---|
| Runtime | [Bun](https://bun.sh) |
| UI Framework | [OpenTUI](https://github.com/opentui/opentui) (React in terminal) |
| AI SDK | [Vercel AI SDK](https://sdk.vercel.ai) |
| Models | [OpenRouter](https://openrouter.ai) (OAuth + API key) |
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

Models auto-refresh from OpenRouter when connected.

---

## Tools (Built-in)

| Tool | Mode | Description |
|---|---|---|
| `readFile` | All | Read text files (max 10K chars) |
| `listDirectory` | All | List directory contents |
| `glob` | All | Glob pattern matching (max 200 results) |
| `grep` | All | Regex search (max 50 matches) |
| `readManyFiles` | All | Batch read up to 12 files |
| `grepManyPatterns` | All | Batch grep up to 8 patterns |
| `agentPlan` | PLAN, ULTRA | Classify task against repo index |
| `repoIndex` | PLAN, ULTRA | Get/refresh workspace index |
| `searchSymbols` | PLAN, ULTRA | Search exports and symbols |
| `affectedTests` | PLAN, ULTRA | Find related test files |
| `readProjectMemory` | ULTRA | Query project facts |
| `rememberProjectFact` | ULTRA | Store a project fact |
| `writeFile` | BUILD, ULTRA | Create or overwrite a file |
| `writeManyFiles` | ULTRA | Batch write up to 8 files |
| `editFile` | BUILD, ULTRA | Find-replace in a file |
| `patchFile` | BUILD, ULTRA | Apply up to 20 patches |
| `bash` | BUILD, ULTRA | Run shell commands (30s timeout) |
| `invokeAI` | ULTRA | Spawn sub-agent for subtasks |

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
