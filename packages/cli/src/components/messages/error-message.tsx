import { TextAttributes } from "@opentui/core";
import { EmptyBorder } from "../border";
import { useTheme } from "../../providers/theme";

type Props = {
  message: string;
  title?: string;
  details?: string;
};

function normalizeDetails(message: string, details?: string) {
  if (!details || details === message) return "";
  return details;
}

export function ErrorMessage({ message, title = "Error", details }: Props) {
  const { colors } = useTheme();
  const normalizedDetails = normalizeDetails(message, details);

  return (
    <box width="100%" alignItems="center">
      <box
        border={["left"]}
        borderColor={colors.error}
        width="100%"
        customBorderChars={{
          ...EmptyBorder,
          vertical: "┃",
          bottomLeft: "╹",
        }}
      >
        <box
          flexDirection="column"
          gap={1}
          justifyContent="center"
          paddingX={2}
          paddingY={1}
          backgroundColor={colors.surface}
          width="100%"
        >
          <text fg={colors.error} attributes={TextAttributes.BOLD}>
            {title}
          </text>
          <text fg={colors.error} wrapMode="word">
            {message}
          </text>
          {normalizedDetails ? (
            <box flexDirection="column" gap={0} width="100%" paddingTop={1}>
              <text attributes={TextAttributes.DIM}>Details</text>
              <text fg={colors.error} attributes={TextAttributes.DIM} wrapMode="word">
                {normalizedDetails}
              </text>
            </box>
          ) : null}
        </box>
      </box>
    </box>
  );
};
