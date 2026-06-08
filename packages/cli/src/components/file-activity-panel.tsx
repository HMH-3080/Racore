import { useEffect, useState } from "react";
import { TextAttributes } from "@opentui/core";
import { useTheme } from "../providers/theme";
import { subscribe, type FileActivity } from "../lib/file-activity-store";
import { RTLText } from "./rtl-text";

export function FileActivityPanel() {
  const { colors } = useTheme();
  const [activities, setActivities] = useState<FileActivity[]>([]);

  useEffect(() => subscribe(setActivities), []);

  return (
    <box
      width={30}
      height="100%"
      flexShrink={0}
      flexDirection="column"
      backgroundColor={colors.dialogSurface}
      paddingX={1}
      paddingY={1}
      gap={1}
      border={["left"]}
      borderColor={colors.dimSeparator}
    >
      <RTLText attributes={TextAttributes.BOLD}>Files</RTLText>
      <scrollbox flexGrow={1} width="100%">
        <box flexDirection="column" gap={1} width="100%">
          {activities.length === 0 ? (
            <box paddingX={1}>
              <RTLText attributes={TextAttributes.DIM}>No file activity</RTLText>
            </box>
          ) : null}

          {[...activities].reverse().slice(0, 50).map((act) => (
            <box
              key={act.id}
              width="100%"
              overflow="hidden"
              paddingX={1}
              paddingY={0}
              flexDirection="column"
            >
              <box flexDirection="row" gap={1} width="100%" overflow="hidden">
                <RTLText
                  fg={
                    act.status === "error" ? colors.error :
                    act.status === "completed" ? colors.success :
                    act.status === "in_progress" ? colors.info :
                    colors.dimSeparator
                  }
                >
                  {act.status === "in_progress" ? "↻" : act.status === "completed" ? "✓" : act.status === "error" ? "✗" : "·"}
                </RTLText>
                <RTLText attributes={TextAttributes.DIM} fg={colors.primary}>
                  {act.action === "write" ? "+" : act.action === "edit" ? "~" : act.action === "patch" ? "Δ" : "−"}
                </RTLText>
                <RTLText attributes={TextAttributes.DIM} wrap="ellipsis" overflow="hidden">
                  {act.filePath.length > 24 ? "..." + act.filePath.slice(-21) : act.filePath}
                </RTLText>
              </box>
              {act.diff && act.diff.length > 0 ? (
                <box flexDirection="column" paddingLeft={3} gap={0}>
                  {act.diff.slice(0, 5).map((line, i) => (
                    <RTLText
                      key={i}
                      fg={line.type === "add" ? colors.success : line.type === "del" ? colors.error : colors.dimSeparator}
                      attributes={TextAttributes.DIM}
                      wrap="ellipsis"
                      overflow="hidden"
                    >
                      {line.type === "add" ? "+" : line.type === "del" ? "-" : " "} {line.text.slice(0, 25)}
                    </RTLText>
                  ))}
                  {act.diff.length > 5 ? (
                    <RTLText attributes={TextAttributes.DIM} fg={colors.dimSeparator}>
                      ... {act.diff.length - 5} more lines
                    </RTLText>
                  ) : null}
                </box>
              ) : null}
            </box>
          ))}
        </box>
      </scrollbox>
    </box>
  );
}
