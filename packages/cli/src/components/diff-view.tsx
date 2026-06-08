import { useTheme } from "../providers/theme";
import { RTLText } from "./rtl-text";
import type { DiffLine } from "../lib/diff-utils";

type DiffViewProps = {
  filePath: string;
  diff: DiffLine[];
  dirsCreated?: string[];
  streaming?: boolean;
};

export function DiffView({ filePath, diff, dirsCreated, streaming }: DiffViewProps) {
  const { colors } = useTheme();
  const adds = diff.filter((d) => d.type === "add").length;
  const dels = diff.filter((d) => d.type === "del").length;

  return (
    <box flexDirection="column" width="100%" gap={0}>
      <box flexDirection="row" gap={1} paddingX={2} paddingY={0}>
        <RTLText fg={streaming ? colors.info : colors.primary} attributes={{ bold: true }}>
          {filePath}
        </RTLText>
        <RTLText fg={colors.dimSeparator} attributes={{ dim: true }}>
          +{adds} -{dels}
        </RTLText>
        {streaming ? (
          <RTLText fg={colors.info} attributes={{ dim: true }}>
            streaming...
          </RTLText>
        ) : null}
      </box>

      {dirsCreated && dirsCreated.length > 0 ? (
        <box flexDirection="column" paddingX={2} gap={0}>
          {dirsCreated.map((dir) => (
            <box key={dir} flexDirection="row" width="100%">
              <RTLText fg={colors.success} attributes={{ dim: true }}>
                📁 {dir}/
              </RTLText>
            </box>
          ))}
        </box>
      ) : null}

      <box flexDirection="column" width="100%" gap={0}>
        {diff.slice(0, 80).map((line, i) => (
          <box
            key={i}
            flexDirection="row"
            width="100%"
            overflow="hidden"
            backgroundColor={
              line.type === "add"
                ? colors.success
                : line.type === "del"
                  ? colors.error
                  : undefined
            }
          >
            <RTLText
              fg={
                line.type === "add"
                  ? "white"
                  : line.type === "del"
                    ? "white"
                    : colors.dimSeparator
              }
              attributes={
                line.type === "ctx" ? { dim: true } : undefined
              }
            >
              {line.type === "add" ? "+" : line.type === "del" ? "-" : " "} {line.text}
            </RTLText>
          </box>
        ))}
        {diff.length > 80 ? (
          <box paddingX={2}>
            <RTLText fg={colors.dimSeparator} attributes={{ dim: true }}>
              ... {diff.length - 80} more lines
            </RTLText>
          </box>
        ) : null}
      </box>
    </box>
  );
}
