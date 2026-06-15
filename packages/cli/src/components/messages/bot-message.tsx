import prettyMs from "pretty-ms";
import { TextAttributes } from "@opentui/core";
import type { Message } from "../../hooks/use-chat";
import { Mode, type ModeType } from "../../lib/app-schema";
import type { DiffLine } from "../../lib/diff-utils";
import { useTheme } from "../../providers/theme";
import { EmptyBorder } from "../border";
import { DiffView } from "../diff-view";
import { MarkdownText } from "./markdown-text";
import { RTLText } from "../rtl-text";
import { BRAILLE_FRAMES, DOTS_FRAMES } from "../../lib/animation-frames";
import { useAnimationFrame } from "../../hooks/use-animation";

/** Animated braille indicator shown while a tool call is executing. */
function ToolRunningIndicator({ color }: { color: string }) {
  const frame = useAnimationFrame(BRAILLE_FRAMES, 80, true);
  return <text fg={color}>{frame} </text>;
}

/** Animated trailing dots for the live "streaming" footer label. */
function StreamingDots() {
  const dots = useAnimationFrame(DOTS_FRAMES, 240, true);
  return <text attributes={TextAttributes.DIM}>streaming{dots}</text>;
}

type ClientMessagePart = Message["parts"][number];
type ToolPart = Extract<ClientMessagePart, { type: `tool-${string}` }>;

type Props = {
  parts: ClientMessagePart[];
  model: string;
  mode: ModeType;
  durationMs?: number;
  streaming?: boolean;
};

function formatToolName(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/^./, (c) => c.toUpperCase());
}

function isToolPart(part: ClientMessagePart): part is ToolPart {
  return part.type.startsWith("tool-");
}

function formatToolArgs(toolPart: ToolPart): string {
  if (toolPart.input == null || typeof toolPart.input !== "object") {
    return "";
  }
  return Object.values(toolPart.input).map(String).join(" ");
}

function formatToolError(part: ToolPart): string {
  if (part.errorText) return part.errorText;

  if (typeof part.output === "string") return part.output;

  if (part.output == null) return "Tool failed without returning an error message.";

  try {
    return JSON.stringify(part.output, null, 2);
  } catch {
    return String(part.output);
  }
}

type PartGroup = {
  type: ClientMessagePart["type"];
  parts: ClientMessagePart[];
  key: string;
};

function groupConsecutiveParts(parts: ClientMessagePart[]): PartGroup[] {
  const groups: PartGroup[] = [];

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]!;
    const lastGroup = groups[groups.length - 1];

    if (lastGroup && lastGroup.type === part.type) {
      lastGroup.parts.push(part);
    } else {
      const key = isToolPart(part) ? `group-tc-${part.toolCallId}` : `group-${part.type}-${i}`;
      groups.push({ type: part.type, parts: [part], key });
    }
  }

  return groups;
}

export function BotMessage({ parts, model, mode, durationMs, streaming = false }: Props) {
  const { colors } = useTheme();
  const modeLabel = mode === Mode.PLAN ? "Plan" : mode === Mode.ULTRA ? "Ultra" : "Build";
  const modeColor = mode === Mode.PLAN ? colors.planMode : mode === Mode.ULTRA ? colors.info : colors.primary;

  return (
    <box width="100%" alignItems="center">
      {groupConsecutiveParts(parts).map((group, i) => (
        <box key={group.key} width="100%" paddingTop={i === 0 ? 0 : 1}>
          {group.parts.map((part, j) => {
            if (part.type === "reasoning") {
              return (
                <box
                  key={`reasoning-${j}`}
                  border={["left"]}
                  borderColor={colors.thinkingBorder}
                  customBorderChars={{
                    ...EmptyBorder,
                    vertical: "│",
                  }}
                  width="100%"
                  paddingX={2}
                >
                  <box flexDirection="column" gap={0} width="100%">
                    <text fg={colors.thinking} attributes={TextAttributes.DIM}>
                      Thinking:
                    </text>
                    <RTLText attributes={TextAttributes.DIM}>
                      {part.text}
                    </RTLText>
                  </box>
                </box>
              );
            }

            if (isToolPart(part)) {
              const toolName = part.type.slice("tool-".length);
              const isFileOp = toolName === "writeFile" || toolName === "editFile" || toolName === "patchFile";
              const output = part.output as { diff?: DiffLine[]; path?: string; dirsCreated?: string[] } | undefined;
              const hasDiff = isFileOp && output?.diff && output.diff.length > 0;
              const isRunning = part.state === "input-available" || part.state === undefined;
              const errorText = part.state === "output-error" ? formatToolError(part) : "";

              return (
                <box
                  key={part.toolCallId}
                  gap={0}
                  width="100%"
                  flexDirection="column"
                >
                  <box
                    border={["left"]}
                    borderColor={isRunning ? colors.info : hasDiff ? colors.focus : colors.thinkingBorder}
                    customBorderChars={{ ...EmptyBorder, vertical: "│" }}
                    width="100%"
                    paddingX={2}
                    flexDirection="column"
                    gap={0}
                  >
                    <box paddingBottom={hasDiff || isRunning || errorText ? 1 : 0} flexDirection="row" gap={1} width="100%">
                      {isRunning ? <ToolRunningIndicator color={colors.info} /> : null}
                      <text fg={colors.info} attributes={TextAttributes.DIM}>
                        {formatToolName(toolName)}:
                      </text>
                      {formatToolArgs(part) ? (
                        <RTLText attributes={TextAttributes.DIM} wrapMode="word">
                          {formatToolArgs(part)}
                        </RTLText>
                      ) : null}
                      {isRunning ? <text attributes={TextAttributes.DIM}>running...</text> : null}
                    </box>
                    {errorText ? (
                      <box
                        border={["left"]}
                        borderColor={colors.error}
                        customBorderChars={{ ...EmptyBorder, vertical: "┃" }}
                        paddingX={2}
                        paddingY={1}
                        width="100%"
                        backgroundColor={colors.surface}
                      >
                        <box flexDirection="column" gap={1} width="100%">
                          <text fg={colors.error} attributes={TextAttributes.BOLD}>
                            Tool error details
                          </text>
                          <RTLText fg={colors.error} wrapMode="word">
                            {errorText}
                          </RTLText>
                        </box>
                      </box>
                    ) : null}
                    {hasDiff ? (
                      <DiffView
                        filePath={output!.path!}
                        diff={output!.diff!}
                        dirsCreated={output!.dirsCreated}
                      />
                    ) : null}
                    {isRunning && isFileOp ? (
                      <RTLText attributes={TextAttributes.DIM} fg={colors.dimSeparator}>
                        waiting for output...
                      </RTLText>
                    ) : null}
                  </box>
                </box>
              );
            }

            if (part.type === "text") {
              return (
                <box key={`text-${j}`} paddingX={3} width="100%">
                  <MarkdownText text={part.text} />
                </box>
              );
            }

            return null;
          })}
        </box>
      ))}

      <box paddingX={3} paddingY={1} gap={1} width="100%">
        <box flexDirection="row" gap={2}>
          <text fg={modeColor}>◉</text>
          <box flexDirection="row" gap={1}>
            <text>{modeLabel}</text>
            <text attributes={TextAttributes.DIM} fg={colors.dimSeparator}>›</text>
            <text attributes={TextAttributes.DIM}>{model}</text>
            {streaming ? <StreamingDots /> : null}
            {durationMs != null ? (
              <>
                <text attributes={TextAttributes.DIM} fg={colors.dimSeparator}>›</text>
                <text attributes={TextAttributes.DIM}>{prettyMs(durationMs)}</text>
              </>
            ) : null}
          </box>
        </box>
      </box>
    </box>
  );
}
