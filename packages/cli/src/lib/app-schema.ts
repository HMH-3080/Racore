import { z } from "zod";

export const Mode = {
  BUILD: "BUILD",
  PLAN: "PLAN",
  ULTRA: "ULTRA",
} as const;

export const ProviderId = {
  OPENROUTER: "openrouter",
  OPENAI: "openai",
  ANTHROPIC: "anthropic",
  GEMINI: "gemini",
  OLLAMA: "ollama",
} as const;

export type ModeType = (typeof Mode)[keyof typeof Mode];
export type ProviderIdType = (typeof ProviderId)[keyof typeof ProviderId];

export const modeSchema = z.enum([Mode.BUILD, Mode.PLAN, Mode.ULTRA]);
export const providerIdSchema = z.enum([
  ProviderId.OPENROUTER,
  ProviderId.OPENAI,
  ProviderId.ANTHROPIC,
  ProviderId.GEMINI,
  ProviderId.OLLAMA,
]);

export type ProviderModel = {
  id: string;
  provider: ProviderIdType;
  label: string;
  capability: string;
  recommended?: boolean;
  supportedParameters?: string[];
  supportsReasoning?: boolean;
  supportsStreaming?: boolean;
  supportsTools?: boolean;
};

export const toolInputSchemas = {
  readFile: z.object({
    path: z.string().describe("Relative path to the file to read"),
  }),
  listDirectory: z.object({
    path: z.string().default(".").describe("Relative directory path to list"),
  }),
  glob: z.object({
    pattern: z.string().describe("Glob pattern to match files"),
    path: z.string().default(".").describe("Directory to search from"),
  }),
  grep: z.object({
    pattern: z.string().describe("Regex pattern to search for"),
    path: z.string().default(".").describe("Directory to search from"),
    include: z.string().optional().describe("Optional glob for files to include"),
  }),
  readManyFiles: z.object({
    paths: z.array(z.string()).min(1).max(12).describe("Relative file paths to read"),
  }),
  grepManyPatterns: z.object({
    queries: z.array(
      z.object({
        pattern: z.string(),
        path: z.string().default("."),
        include: z.string().optional(),
      }),
    ).min(1).max(8),
  }),
  agentPlan: z.object({
    task: z.string().describe("The user's task to classify and plan against the cached repo index"),
    refreshIndex: z.boolean().optional().describe("Force a repo index refresh before planning"),
  }),
  repoIndex: z.object({
    refresh: z.boolean().optional().describe("Force a repo index refresh"),
  }),
  searchSymbols: z.object({
    query: z.string().describe("Symbol, export, function, class, or type to find"),
    limit: z.number().optional().describe("Maximum symbol matches to return"),
    refresh: z.boolean().optional().describe("Force a repo index refresh"),
  }),
  affectedTests: z.object({
    paths: z.array(z.string()).optional().describe("Changed or likely changed relative file paths"),
    task: z.string().optional().describe("Optional task description used when paths are unknown"),
    refresh: z.boolean().optional().describe("Force a repo index refresh"),
  }),
  readProjectMemory: z.object({
    query: z.string().optional().describe("Optional topic to filter stored project facts"),
  }),
  rememberProjectFact: z.object({
    fact: z.string().describe("A concise durable project fact that will speed up future runs"),
  }),
  writeFile: z.object({
    path: z.string().describe("Relative path to write"),
    content: z.string().describe("File contents"),
  }),
  writeManyFiles: z.object({
    files: z.array(
      z.object({
        path: z.string(),
        content: z.string(),
      }),
    ).min(1).max(8),
  }),
  editFile: z.object({
    path: z.string().describe("Relative path to edit"),
    oldString: z.string().describe("Exact text to replace; must be unique"),
    newString: z.string().describe("Replacement text"),
  }),
  patchFile: z.object({
    path: z.string().describe("Relative path to patch"),
    patches: z.array(
      z.object({
        action: z.enum(["replace", "insertBefore", "insertAfter", "append"]),
        anchor: z.string().optional().describe("Exact anchor text for replace/insert actions"),
        content: z.string().describe("Replacement or inserted content"),
      }),
    ).min(1).max(20),
  }),
  bash: z.object({
    command: z.string().describe("Shell command to run"),
    description: z.string().optional().describe("Short description of the command"),
    timeout: z.number().optional().describe("Timeout in milliseconds"),
  }),
  invokeAI: z.object({
    task: z.string().describe("A focused subtask for a parallel AI pass"),
    context: z.string().optional().describe("Optional extra context for the subtask"),
  }),
  updateTodoList: z.object({
    updates: z.array(z.object({
      id: z.string().optional().describe("Todo ID to update (omit to create new)"),
      title: z.string().describe("Title or description of the todo item"),
      status: z.enum(["pending", "in_progress", "completed", "cancelled"]).default("pending").describe("New status"),
    })).describe("List of todo items to create or update"),
  }),
  getTodoList: z.object({}).describe("Get the current todo list"),
  gitStatus: z.object({}).describe("Get the current git branch and working tree status"),
  gitDiff: z.object({
    staged: z.boolean().optional().describe("Show staged changes instead of unstaged"),
    path: z.string().optional().describe("Limit the diff to a specific path"),
  }),
  gitLog: z.object({
    limit: z.number().optional().describe("Number of recent commits to show (default 10, max 50)"),
  }),
  gitCommit: z.object({
    message: z.string().describe("Commit message"),
    paths: z.array(z.string()).optional().describe("Specific paths to stage and commit"),
    stageAll: z.boolean().optional().describe("Stage all changes before committing"),
  }),
  webFetch: z.object({
    url: z.string().describe("Public http(s) URL to fetch (docs, READMEs, changelogs)"),
    maxBytes: z.number().optional().describe("Maximum content bytes to return"),
  }),
  verifyChanges: z.object({
    paths: z.array(z.string()).optional().describe("Changed file paths to focus lint on"),
  }).describe("Run typecheck and lint to verify recent edits; call after making changes"),
  listCheckpoints: z.object({
    limit: z.number().optional().describe("Maximum checkpoints to list"),
  }).describe("List restore points captured before agent edits"),
  restoreCheckpoint: z.object({
    id: z.string().optional().describe("Checkpoint ID to restore (omit for the most recent)"),
  }).describe("Undo agent edits by restoring files from a checkpoint"),
  listSkills: z.object({}).describe("List reusable skills available for this project and user"),
  useSkill: z.object({
    name: z.string().describe("Name of the skill to load"),
  }).describe("Load a skill's full instructions to apply to the current task"),
  createSkill: z.object({
    name: z.string().describe("Short skill name, e.g. 'deploy-frontend'"),
    description: z.string().describe("One-line description of when to use this skill"),
    triggers: z.string().optional().describe("Comma-separated keywords that should activate the skill"),
    content: z.string().describe("Markdown instructions: the reusable procedure, commands, and pitfalls"),
  }).describe("Save a new reusable skill after solving a novel, repeatable problem"),
} as const;

export type MessageMetadata = {
  mode?: ModeType;
  model?: string;
  provider?: ProviderIdType;
  durationMs?: number;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  toolCalls?: number;
};

export type TextPart = {
  type: "text";
  text: string;
};

export type ReasoningPart = {
  type: "reasoning";
  text: string;
};

export type ToolMessagePart = {
  type: `tool-${string}`;
  toolCallId: string;
  input?: Record<string, unknown>;
  output?: unknown;
  state?: "input-available" | "output-available" | "output-error";
  errorText?: string;
};

export type MessagePart = TextPart | ReasoningPart | ToolMessagePart;

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  parts: MessagePart[];
  metadata?: MessageMetadata;
};

export type SessionRecord = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
};

export type ProviderAuthState = {
  apiKey?: string;
  connectedAt?: string;
  authType?: "oauth" | "api-key";
};

export type AuthState = Record<ProviderIdType, ProviderAuthState>;

export type AppConfig = {
  activeProvider: ProviderIdType;
  modelByProvider: Record<ProviderIdType, string>;
  mode: ModeType;
};
