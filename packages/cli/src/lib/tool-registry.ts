import { generateText, tool, type ModelMessage, type ToolSet } from "ai";
import { Mode, toolInputSchemas, type ModeType } from "./app-schema";
import { executeLocalTool } from "./local-tools";

/** Tools available in every mode. PLAN-mode write protection is enforced inside executeLocalTool. */
const CORE_TOOLS = [
  "affectedTests",
  "updateTodoList",
  "getTodoList",
  "readFile",
  "listDirectory",
  "glob",
  "grep",
  "readManyFiles",
  "grepManyPatterns",
  "writeFile",
  "editFile",
  "patchFile",
  "bash",
  "gitStatus",
  "gitDiff",
  "gitLog",
  "gitCommit",
  "webFetch",
  "verifyChanges",
  "listCheckpoints",
  "restoreCheckpoint",
  "listSkills",
  "useSkill",
  "createSkill",
] as const;

/** Repo-mapping tools enabled in PLAN and ULTRA modes. */
const PLANNING_TOOLS = ["agentPlan", "repoIndex", "searchSymbols"] as const;

/** Batch and memory tools reserved for ULTRA mode. */
const HEAVY_TOOLS = ["readProjectMemory", "rememberProjectFact", "writeManyFiles"] as const;

type LocalToolName = keyof typeof toolInputSchemas;

function makeLocalTool(name: LocalToolName, mode: ModeType) {
  return tool({
    inputSchema: toolInputSchemas[name],
    execute: async (input) => executeLocalTool(name, input, mode),
  });
}

export type ToolRegistryParams = {
  mode: ModeType;
  /** The active language model, used by the invokeAI sub-agent in ULTRA mode. */
  model: Parameters<typeof generateText>[0]["model"];
  /** Conversation context shared with sub-agents. */
  coreMessages: ModelMessage[];
  /** Tools contributed by configured MCP servers. Local tools win on name clashes. */
  mcpTools?: ToolSet;
};

/**
 * Build the complete agent toolset for a turn. Replaces the previous inline
 * 150-line object in chat-service with a declarative, mode-aware registry.
 */
export function buildToolRegistry(params: ToolRegistryParams): ToolSet {
  const { mode } = params;
  const usePlanningTools = mode === Mode.PLAN || mode === Mode.ULTRA;
  const useHeavyTools = mode === Mode.ULTRA;

  const registry: ToolSet = { ...(params.mcpTools ?? {}) };

  if (usePlanningTools) {
    for (const name of PLANNING_TOOLS) {
      registry[name] = makeLocalTool(name, mode);
    }
  }

  for (const name of CORE_TOOLS) {
    registry[name] = makeLocalTool(name, mode);
  }

  if (useHeavyTools) {
    for (const name of HEAVY_TOOLS) {
      registry[name] = makeLocalTool(name, mode);
    }

    registry["invokeAI"] = tool({
      inputSchema: toolInputSchemas.invokeAI,
      execute: async (input) => {
        const subtask = await generateText({
          model: params.model,
          system: "You are a focused sub-agent for R'a Core Ultra Mode. Solve the subtask concisely.",
          messages: [
            ...params.coreMessages,
            {
              role: "user",
              content: [
                `Subtask: ${input.task}`,
                input.context ? `Context: ${input.context}` : "",
              ].filter(Boolean).join("\n"),
            },
          ],
          maxRetries: 0,
        });

        return { text: subtask.text };
      },
    });
  }

  return registry;
}
