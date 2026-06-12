import { BRAILLE_FRAMES, SWEEP_FRAMES } from "../lib/animation-frames";
import { Mode, type ModeType } from "../lib/app-schema";
import { useAnimationFrame } from "../hooks/use-animation";
import { useTheme } from "../providers/theme";

type Props = {
  mode?: ModeType;
};

/**
 * Mode-aware Unicode spinner: braille rotation for Build/Plan, an energy
 * sweep for Ultra. Pure React state, no external spinner dependency.
 */
export function Spinner({ mode = Mode.BUILD }: Props) {
  const { colors } = useTheme();
  const activeColor =
    mode === Mode.PLAN ? colors.planMode : mode === Mode.ULTRA ? colors.info : colors.primary;
  const frames = mode === Mode.ULTRA ? SWEEP_FRAMES : BRAILLE_FRAMES;
  const frame = useAnimationFrame(frames, 80, true);

  return <text fg={activeColor}>{frame}</text>;
}
