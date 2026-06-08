import { useTheme } from "../providers/theme";
import { RTLText } from "./rtl-text";
import type { DiffLine } from "../lib/diff-utils";
import { EmptyBorder } from "./border";

type DiffViewProps = {
  filePath: string;
  diff: DiffLine[];
  action?: string;
  streaming?: boolean;
};

export function DiffView({ filePath, diff, action, streaming }: DiffViewProps) {
  const { colors } = useTheme();
  const adds = diff.filter((d) => d.type === "add").length;
  const dels = diff.filter((d) => d.type === "del").length;

  const borderColor = dels > 0 ? colors.error : colors.success;

  return (
    <box
      border={["left"]}
      borderColor={borderColor}
      customBorderChars={{ ...EmptyBorder, vertical: "\u2502" }}
      flexDirection="column"
      width="100%"
      paddingY={0}
    >
      <box flexDirection="column" paddingX={2} width="100%" gap={0}>
        <box flexDirection="row" gap={1}>
          <RTLText fg={colors.primary} attributes={{ bold: true }}>
            {filePath}
          </RTLText>
          {action ? (
            <RTLText fg={colors.dimSeparator} attributes={{ dim: true }}>
              {action}
            </RTLText>
          ) : null}
          {streaming ? (
            <RTLText fg={colors.info} attributes={{ dim: true }}>
              streaming...
            </RTLText>
          ) : (
            <RTLText fg={colors.dimSeparator} attributes={{ dim: true }}>
              +{adds} -{dels}
            </RTLText>
          )}
        </box>

        <box flexDirection="column" width="100%" gap={0}>
          {diff.slice(0, 80).map((line, i) => (
            <box key={i} flexDirection="row" width="100%" overflow="hidden">
              {line.type === "add" ? (
                <RTLText fg={colors.success}>+ {line.text}</RTLText>
              ) : line.type === "del" ? (
                <RTLText fg={colors.error}>- {line.text}</RTLText>
              ) : (
                <RTLText fg={colors.dimSeparator} attributes={{ dim: true }}>
                  {"  "}{line.text}
                </RTLText>
              )}
            </box>
          ))}
          {diff.length > 80 ? (
            <RTLText fg={colors.dimSeparator} attributes={{ dim: true }}>
              ... {diff.length - 80} more lines
            </RTLText>
          ) : null}
        </box>
      </box>
    </box>
  );
}
