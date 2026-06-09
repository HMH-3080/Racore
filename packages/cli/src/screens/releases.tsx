import { useNavigate } from "react-router";
import { TextAttributes } from "@opentui/core";
import { CenteredPage } from "../components/centered-page";
import { APP_NAME, CLI_DESCRIPTION, CLI_VERSION } from "../lib/app-info";
import { getReleaseNotes, getCurrentRelease } from "../lib/release-notes";
import { performSelfUpdate } from "../lib/self-update";
import { useTheme } from "../providers/theme";
import { useToast } from "../providers/toast";

export function ReleasesScreen() {
  const navigate = useNavigate();
  const { colors } = useTheme();
  const toast = useToast();
  const currentRelease = getCurrentRelease();
  const allReleases = getReleaseNotes();

  return (
    <CenteredPage
      title={`${APP_NAME} Releases`}
      description={CLI_DESCRIPTION}
      actions={[
        { label: "Back", onSelect: () => navigate("/config"), tone: "muted" },
        { label: "Onboarding", onSelect: () => navigate("/onboarding") },
        {
          label: "Update Now",
          onSelect: () => {
            void performSelfUpdate().then((result) => {
              toast.show({
                variant: result.ok ? "success" : "error",
                duration: result.ok ? 6000 : 8000,
                message: result.message,
              });
            });
          },
          tone: "primary",
        },
        { label: "Home", onSelect: () => navigate("/") },
      ]}
    >
      <box flexDirection="row" gap={1}>
        <text wrapMode="word">Version: </text>
        <text fg={colors.primary} attributes={TextAttributes.BOLD}>{CLI_VERSION}</text>
      </box>

      {[...allReleases].reverse().map((release) => {
        const isCurrent = release.version === CLI_VERSION;
        return (
          <box
            key={release.version}
            flexDirection="column"
            border={["left"]}
            borderColor={isCurrent ? colors.accent : colors.primary}
            paddingLeft={2}
            paddingY={1}
            gap={1}
            backgroundColor={isCurrent ? colors.dialogSurface : undefined}
          >
            <box flexDirection="row" gap={1}>
              <text fg={isCurrent ? colors.accent : "white"} attributes={isCurrent ? TextAttributes.BOLD : undefined}>
                {release.version}
              </text>
              {isCurrent ? (
                <text fg={colors.accent} attributes={TextAttributes.BOLD}>← current</text>
              ) : null}
            </box>
            <text fg={isCurrent ? colors.accent : "white"}>{release.title}</text>
            <text wrapMode="word" attributes={{ dim: true }}>{release.description}</text>
            {release.changes.map((change) => (
              <text key={change} wrapMode="word" attributes={{ dim: true }}>- {change}</text>
            ))}
          </box>
        );
      })}
    </CenteredPage>
  );
}
