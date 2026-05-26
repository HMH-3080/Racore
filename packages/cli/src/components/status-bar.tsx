import { TextAttributes } from "@opentui/core";
import { CLI_VERSION } from "../lib/app-info";
import { Mode } from "../lib/app-schema";
import { usePromptConfig } from "../providers/prompt-config";
import { useTheme } from "../providers/theme";

export function StatusBar() {
  const { mode, model, provider } = usePromptConfig();
  const { colors } = useTheme();

  return (
    <box flexDirection="row" gap={1}>
      <text fg={mode === Mode.PLAN ? colors.planMode : colors.primary}>
        {mode === Mode.PLAN ? "Plan" : "Build"}
      </text>
      <text attributes={TextAttributes.DIM} fg={colors.dimSeparator}>›</text>
      <text>{provider}</text>
      <text attributes={TextAttributes.DIM} fg={colors.dimSeparator}>›</text>
      <text>{model}</text>
      <text attributes={TextAttributes.DIM} fg={colors.dimSeparator}>›</text>
      <text attributes={TextAttributes.DIM}>v{CLI_VERSION}</text>
    </box>
  );
}
