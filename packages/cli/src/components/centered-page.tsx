import { TextAttributes } from "@opentui/core";
import type { ReactNode } from "react";
import { Header } from "./header";
import { useTheme } from "../providers/theme";

type Action = {
  label: string;
  onSelect: () => void;
  tone?: "primary" | "info" | "muted";
};

type CenteredPageProps = {
  title: string;
  description?: string;
  children: ReactNode;
  actions?: Action[];
  footerHint?: string;
};

function ActionLink({ action }: { action: Action }) {
  const { colors } = useTheme();

  return (
    <text
      fg={
        action.tone === "primary"
          ? colors.primary
          : action.tone === "muted"
            ? colors.dimSeparator
            : colors.info
      }
      onMouseDown={action.onSelect}
    >
      [{action.label}]
    </text>
  );
}

export function CenteredPage({
  title,
  description,
  children,
  actions = [],
  footerHint = "tab mode",
}: CenteredPageProps) {
  const { colors } = useTheme();

  return (
    <box
      alignItems="center"
      justifyContent="center"
      flexGrow={1}
      width="100%"
      height="100%"
      paddingX={4}
      paddingY={2}
    >
      <box width="100%" maxWidth={100} flexDirection="column" gap={2} alignItems="center">
        <Header />
        <box
          width="100%"
          maxWidth={84}
          backgroundColor={colors.surface}
          border={["left", "right"]}
          borderColor={colors.thinkingBorder}
          customBorderChars={{
            vertical: "│",
            horizontal: " ",
            topLeft: " ",
            topRight: " ",
            bottomLeft: " ",
            bottomRight: " ",
          }}
          paddingX={4}
          paddingY={2}
          flexDirection="column"
          gap={2}
        >
          <box alignItems="center" justifyContent="center">
            <text attributes={TextAttributes.BOLD}>{title.toUpperCase()}</text>
          </box>
          {description ? (
            <box width="100%" justifyContent="center" paddingX={2}>
              <text fg={colors.dimSeparator} wrapMode="word" textAlign="center">
                {description}
              </text>
            </box>
          ) : null}
          <box width="100%" flexDirection="column" gap={2}>
            {children}
          </box>
          {actions.length > 0 ? (
            <box width="100%" justifyContent="center" paddingTop={1}>
              <box flexDirection="row" gap={2} flexWrap="wrap" justifyContent="center">
                {actions.map((action) => (
                  <ActionLink key={action.label} action={action} />
                ))}
              </box>
            </box>
          ) : null}
        </box>
        <box width="100%" maxWidth={84} justifyContent="flex-end">
          <box flexDirection="row" gap={1}>
            <text>tab</text>
            <text attributes={TextAttributes.DIM}>{footerHint}</text>
          </box>
        </box>
      </box>
    </box>
  );
}
