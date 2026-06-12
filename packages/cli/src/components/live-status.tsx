import { useEffect, useState } from "react";
import { TextAttributes } from "@opentui/core";
import { BRAILLE_FRAMES, DOTS_FRAMES, SWEEP_FRAMES, WORDMARK } from "../lib/animation-frames";
import {
  formatAgentActivity,
  getAgentActivity,
  subscribeAgentActivity,
  type AgentActivity,
} from "../lib/agent-activity-store";
import { Mode, type ModeType } from "../lib/app-schema";
import { useAnimationFrame, useElapsedSeconds } from "../hooks/use-animation";
import { useTheme } from "../providers/theme";
import { ShimmerText } from "./shimmer-text";

type Props = {
  mode?: ModeType;
  interruptible?: boolean;
};

/**
 * The live agent status line: animated R'a Core wordmark, a mode-aware
 * Unicode spinner, the activity currently in flight (thinking / running
 * <tool> / responding), and a ticking elapsed timer.
 */
export function LiveStatus({ mode = Mode.BUILD, interruptible = false }: Props) {
  const { colors } = useTheme();
  const [activity, setActivity] = useState<AgentActivity>(() => getAgentActivity());

  useEffect(() => subscribeAgentActivity(setActivity), []);

  const activeColor =
    mode === Mode.PLAN ? colors.planMode : mode === Mode.ULTRA ? colors.info : colors.primary;
  const spinnerFrames = mode === Mode.ULTRA ? SWEEP_FRAMES : BRAILLE_FRAMES;
  const spinner = useAnimationFrame(spinnerFrames, 80, true);
  const dots = useAnimationFrame(DOTS_FRAMES, 240, true);
  const elapsed = useElapsedSeconds(true, activity.startedAt);
  const label = formatAgentActivity(activity) || "working";

  return (
    <box flexDirection="row" alignItems="center" gap={1}>
      <text fg={activeColor}>{spinner}</text>
      <ShimmerText text={WORDMARK} color={activeColor} />
      <text attributes={TextAttributes.DIM} fg={colors.dimSeparator}>{">"}</text>
      <text attributes={TextAttributes.DIM}>
        {label}
        {dots}
      </text>
      {elapsed > 0 ? <text attributes={TextAttributes.DIM}>{elapsed}s</text> : null}
      {interruptible ? (
        <text attributes={TextAttributes.DIM} fg={colors.dimSeparator}>
          esc to interrupt
        </text>
      ) : null}
    </box>
  );
}
