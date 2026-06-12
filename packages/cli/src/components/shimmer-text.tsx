import { TextAttributes } from "@opentui/core";
import { useAnimationIndex } from "../hooks/use-animation";
import { useTheme } from "../providers/theme";

type Props = {
  text: string;
  /** Accent color of the moving highlight. Defaults to the theme primary. */
  color?: string;
  intervalMs?: number;
  active?: boolean;
};

/**
 * Animated wordmark: a highlight sweeps across the text character by
 * character, giving the R'a Core brand a live, breathing feel without
 * changing layout or width.
 */
export function ShimmerText({ text, color, intervalMs = 120, active = true }: Props) {
  const { colors } = useTheme();
  const characters = [...text];
  // Sweep past the end so the shimmer "leaves" before looping.
  const index = useAnimationIndex(characters.length + 4, intervalMs, active);
  const accent = color ?? colors.primary;

  return (
    <box flexDirection="row">
      {characters.map((character, characterIndex) => {
        const distance = Math.abs(characterIndex - index);
        if (distance === 0) {
          return (
            <text key={characterIndex} fg={accent} attributes={TextAttributes.BOLD}>
              {character}
            </text>
          );
        }
        if (distance === 1) {
          return (
            <text key={characterIndex} fg={accent}>
              {character}
            </text>
          );
        }
        return (
          <text key={characterIndex} attributes={TextAttributes.DIM}>
            {character}
          </text>
        );
      })}
    </box>
  );
}
