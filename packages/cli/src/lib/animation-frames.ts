/**
 * Shared Unicode animation frames for the R'a Core TUI.
 * Kept as plain constants so every component animates in the same rhythm.
 */

/** Classic braille spinner - smooth and terminal-safe. */
export const BRAILLE_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"] as const;

/** Pulsing star used to flank the R'a Core wordmark. */
export const PULSE_FRAMES = ["✶", "✸", "✹", "✺", "✹", "✸"] as const;

/** Orbiting dots for subtle "thinking" feedback. */
export const ORBIT_FRAMES = ["⠁", "⠂", "⠄", "⡀", "⢀", "⠠", "⠐", "⠈"] as const;

/** Trailing dots for streaming/working labels. */
export const DOTS_FRAMES = ["·  ", "·· ", "···", " ··", "  ·", "   "] as const;

/** Energy bar sweep used for ULTRA mode. */
export const SWEEP_FRAMES = [
  "▰▱▱▱▱",
  "▰▰▱▱▱",
  "▰▰▰▱▱",
  "▰▰▰▰▱",
  "▰▰▰▰▰",
  "▱▰▰▰▰",
  "▱▱▰▰▰",
  "▱▱▱▰▰",
  "▱▱▱▱▰",
  "▱▱▱▱▱",
] as const;

/** The animated wordmark text, shimmered character by character. */
export const WORDMARK = "R'a Core";

/** Default frame interval (ms) - 80ms keeps animations fluid at low cost. */
export const FRAME_INTERVAL_MS = 80;
