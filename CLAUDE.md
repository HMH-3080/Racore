# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

**R'a Core CLI** (`@loai/racore-cli`) is a terminal-based AI coding assistant built as a React application rendered in the terminal via OpenTUI. The repo is an npm workspace monorepo with three packages: `packages/cli` (main app), `packages/mcp-core`, and `packages/team-engine`. All active development is in `packages/cli`.

Tech stack: Bun runtime, React 19, TypeScript ES modules, `@opentui/react` for TUI rendering, `ai` SDK + `@ai-sdk/openai` / `@openrouter/ai-sdk-provider` for model calls, React Router v7 for screen navigation.

Runtime data is stored in `~/.racore/` (auth, config, preferences, sessions).

## Development Commands

All commands run from the **repo root** unless noted.

```bash
# Install dependencies (first-time setup)
bun install

# Dev mode (watches packages/cli/src/index.tsx)
bun run dev:cli

# Build CLI to packages/cli/dist/
bun run build:cli

# Run all CLI tests
bun run test:cli

# Run a single test file (from packages/cli/)
node ../../scripts/run-bun.mjs test src/lib/<test-file>.test.ts

# Link CLI binary locally for manual testing
npm run link:cli

# Bump version (patch/minor/major) — updates packages/cli/package.json only
npm run version:patch
```

`scripts/run-bun.mjs` is a thin wrapper that ensures Bun commands run consistently across environments.

## Publishing

```bash
npm publish --workspace @loai/racore-cli --access public
```

`prepublishOnly` runs the build automatically. Update `CHANGELOG.md` before publishing.

## Architecture

### Entry point & routing

`packages/cli/src/index.tsx` bootstraps all React context providers and mounts the React Router router. Screens in `src/screens/` are the top-level route components — this is where to start when changing a user flow.

### Core logic (`src/lib/`)

This directory holds all non-UI behavior:

- **chat-service.ts** — Assembles the four-protocol system prompt (Speed / Task Plan / Completion / Skills) and orchestrates streaming model requests. Auto-injects relevant skills based on task context.
- **agent-accelerator.ts** — Pre-turn intent classifier: categorizes tasks (bug/feature/refactor/docs/config/test/UI), scores risk, selects candidate files from the repo index, and builds an acceleration strategy passed into the prompt.
- **local-tools.ts** — All 21+ built-in tools: file ops, git, task management, skills CRUD, verification, web fetch.
- **tool-registry.ts** — Assembles the active toolset per turn from `CORE_TOOLS + PLANNING_TOOLS + HEAVY_TOOLS` plus any MCP tools.
- **skills.ts** — Reusable expertise packs stored as markdown files. `findRelevantSkills()` handles auto-injection; `createSkill()` lets the agent persist new expertise.
- **todo-store.ts** — Reactive task list. `getPendingTodos()` / `getInProgressTodos()` drive the Task Plan protocol.
- **checkpoint-store.ts** — Snapshots files before edits; supports restore.
- **config-store.ts** — Persistent provider/key/settings config.
- **models.ts** — Model definitions, provider metadata, validation.
- **mcp.ts** — MCP server integration.

### Auto-continue engine (`src/hooks/use-chat.ts`)

After each assistant turn, `hasPendingTasks()` inspects `getTodoList`/`updateTodoList` tool outputs. If tasks remain, it auto-submits a continuation prompt — up to 12 rounds. Escape key sets `abortRef` to interrupt. A "Final Report" heading in the response signals completion.

### UI layer

- `src/components/app-shell.tsx` — Global layout (header, status bar, child routing).
- `src/components/session-shell.tsx` — Renders and streams AI responses.
- `src/components/input-bar.tsx` — Primary user input.
- `src/components/dialogs/` — Modal stack for config, provider/model selection, API keys, theme, sessions.
- `src/providers/` — React contexts for theme, dialog stack, keyboard layer, toasts, and prompt config.