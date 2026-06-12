import { TextAttributes } from "@opentui/core";
import { CLI_VERSION } from "../lib/app-info";
import { PULSE_FRAMES } from "../lib/animation-frames";
import { useAnimationFrame } from "../hooks/use-animation";
import { useTheme } from "../providers/theme";

export function Header() {
  const { colors } = useTheme();
  // Slow heartbeat pulse flanking the wordmark keeps the home screen alive
  // without being distracting.
  const pulse = useAnimationFrame(PULSE_FRAMES, 320, true);

  return (
    <box flexDirection="column" justifyContent="center" alignItems="center" gap={1}>
      <box flexDirection="row" justifyContent="center" gap={1} alignItems="center">
        <text fg={colors.primary}>{pulse}</text>
        <box flexDirection="row" gap={0.5} alignItems="center">
          <ascii-font font="tiny" text="R'a" color="gray" />
          <ascii-font font="tiny" text="Core" />
        </box>
        <text fg={colors.primary}>{pulse}</text>
      </box>
      <text attributes={TextAttributes.DIM}>v{CLI_VERSION}</text>
    </box>
  );
}
