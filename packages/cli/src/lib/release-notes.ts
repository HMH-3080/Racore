import { CLI_VERSION } from "./app-info";

export type ReleaseNote = {
  version: string;
  title: string;
  description: string;
  changes: string[];
};

const RELEASES: ReleaseNote[] = [
  {
    version: "1.0.0",
    title: "Standalone Rewrite",
    description: "Turned R'a Core into a standalone CLI with local persistence and direct provider configuration.",
    changes: [
      "Removed server, shared, and database packages",
      "Added local session and config storage",
      "Added OpenAI/Codex and OpenRouter configuration",
      "Added npm onboarding, release notes, and update checking",
    ],
  },
  {
    version: "2.0.0",
    title: "Terminal AI Coding Assistant",
    description: "Full React-based TUI with three AI modes, OAuth login, project intelligence, and 18 built-in tools.",
    changes: [
      "Complete rewrite with OpenTUI React framework",
      "Three AI modes: BUILD, PLAN, and ULTRA",
      "OpenRouter OAuth PKCE login flow",
      "Project workspace indexing and memory system",
      "18 built-in tools for file operations, search, and shell commands",
      "32 dark themes with font size customization",
      "Local session persistence with history browsing",
      "In-app command palette (/commands)",
      "Auto-fallback model routing on failures",
      "Multi-file batch read/write/edit operations",
      "Sub-agent invocation for complex tasks (ULTRA mode)",
      "Affected test detection and strategy generation",
    ],
  },
  {
    version: "2.1.0",
    title: "RTL & Todo System",
    description: "Arabic text support, parallel task execution, and reactive todo management.",
    changes: [
      "Arabic/RTL text support with Unicode bidi markers",
      "RTLText component for automatic Arabic detection",
      "Reactive todo store with batch updates, stats, and subscriptions",
      "AI task planner — decomposes complex prompts into subtasks",
      "Parallel task executor with configurable concurrency (max 3)",
      "Rate limiting with exponential backoff for OpenRouter",
      "MarkdownText component for code blocks, headers, lists",
      "TodoPanel sidebar showing live task progress with animated spinners",
      "Integration: complex prompts auto-decompose into todos on submit",
    ],
  },
  {
    version: "2.1.1",
    title: "Usage Tracking",
    description: "Token usage statistics, cost tracking, and real-time usage dashboard.",
    changes: [
      "Usage store tracking tokens (input/output/total), cost, duration",
      "Usage statistics screen (/usage) with auto-refresh",
      "Home screen chat area constrained to maxWidth=78 with overflow hidden",
      "Fixed overflow in session-shell input bar and scrollbox",
      "/usage command added to command palette",
      "Onboarding SKIP if config.json exists",
    ],
  },
  {
    version: "2.2.0",
    title: "Live Diff Display",
    description: "Real-time file diffs with green/red background colors, folder creation tracking, and AI-managed todo decomposition.",
    changes: [
      "Line-based LCS diff algorithm for computing file changes",
      "Colored diff display with green background for additions, red for deletions",
      "File activity tracking — in_progress → completed with diff snapshots",
      "writeFile/editFile/patchFile all compute diffs and track folder creation",
      "Real-time file diffs appear DIRECTLY inside bot response (no separate panel)",
      "Created folders displayed (📁 path/) before file content",
      "System prompt instructs AI: FIRST decompose request into todos via updateTodoList",
      "AI manages all todo statuses (in_progress → completed) automatically",
      "Removed auto-fallback model routing — strictly uses user-selected model only",
      "Same-prefix model fallback only (qwen/ → qwen/, google/ → google/)",
      "Input token estimation when API doesn't return usage data",
    ],
  },
];

export function getReleaseNotes(): ReleaseNote[] {
  return [...RELEASES];
}

export function getCurrentRelease(): ReleaseNote | undefined {
  return RELEASES.find((r) => r.version === CLI_VERSION);
}
