import { useCallback, useMemo } from "react";
import { useNavigate } from "react-router";
import { TextAttributes } from "@opentui/core";
import { InputBar } from "../components/input-bar";
import { usePromptConfig } from "../providers/prompt-config";
import { useTheme } from "../providers/theme";
import { listSessions } from "../lib/session-store";

function shortTitle(title: string) {
  return title.length > 24 ? `${title.slice(0, 21)}...` : title;
}

export function Home() {
  const navigate = useNavigate();
  const { colors } = useTheme();
  const { mode, model, provider } = usePromptConfig();
  const sessions = useMemo(() => listSessions().slice(0, 12), []);

  const handleSubmit = useCallback(
    (text: string) => {
      navigate("/sessions/new", { state: { message: text, mode, model } });
    },
    [navigate, mode, model],
  );

  return (
    <box
      width="100%"
      height="100%"
      flexGrow={1}
      flexDirection="row"
      backgroundColor={colors.background}
    >
      <box
        width={30}
        height="100%"
        flexShrink={0}
        flexDirection="column"
        backgroundColor={colors.dialogSurface}
        paddingX={2}
        paddingY={1}
        gap={1}
      >
        <box flexDirection="row" alignItems="center" justifyContent="space-between" width="100%">
          <text attributes={TextAttributes.BOLD}>racore</text>
          <text color={colors.accent}>[new]</text>
        </box>

        <box
          onClick={() => navigate("/")}
          width="100%"
          backgroundColor={colors.selection}
          paddingX={1}
          paddingY={1}
        >
          <text color={colors.selectionText}>New chat</text>
        </box>

        <text attributes={TextAttributes.DIM}>Sessions</text>
        <scrollbox flexGrow={1} width="100%">
          <box flexDirection="column" gap={1} width="100%">
            {sessions.length === 0 ? (
              <box paddingX={1}>
                <text attributes={TextAttributes.DIM}>No saved chats yet</text>
              </box>
            ) : null}

            {sessions.map((session) => (
              <box
                key={session.id}
                onClick={() => navigate(`/sessions/${session.id}`)}
                width="100%"
                overflow="hidden"
                paddingX={1}
                paddingY={1}
                backgroundColor={colors.surface}
              >
                <text>{shortTitle(session.title)}</text>
              </box>
            ))}
          </box>
        </scrollbox>

        <box flexDirection="column" gap={1}>
          <text color={colors.accent}>[/config]</text>
          <text color={colors.accent}>[/releases]</text>
        </box>
      </box>

      <box
        flexGrow={1}
        height="100%"
        flexDirection="column"
        alignItems="center"
        justifyContent="space-between"
        paddingX={4}
        paddingY={2}
      >
        <box height={1} />

        <box flexDirection="column" alignItems="center" gap={1}>
          <ascii-font font="tiny" text="R'a Core" />
          <text attributes={TextAttributes.DIM}>Your standalone coding agent</text>
          <box flexDirection="row" gap={1} marginTop={1}>
            <text color={colors.modeBuild}>{mode === "BUILD" ? "Normal" : mode === "ULTRA" ? "Ultra" : "Plan"}</text>
            <text attributes={TextAttributes.DIM}>›</text>
            <text>{provider}</text>
            <text attributes={TextAttributes.DIM}>›</text>
            <text>{model}</text>
          </box>
        </box>

        <box width="100%" maxWidth={78} flexDirection="column" gap={1}>
          <InputBar onSubmit={handleSubmit} />
          <box flexDirection="row" justifyContent="space-between" width="100%" paddingX={1}>
            <box flexDirection="row" gap={2}>
              <text color={colors.accent}>/config</text>
              <text color={colors.accent}>/sessions</text>
              <text color={colors.accent}>/releases</text>
            </box>
            <box flexDirection="row" gap={1}>
              <text>tab</text>
              <text attributes={TextAttributes.DIM}>mode</text>
            </box>
          </box>
        </box>
      </box>
    </box>
  );
};
