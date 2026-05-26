import { useMemo, useState, type ReactNode } from "react";
import { TextAttributes } from "@opentui/core";
import { useNavigate } from "react-router";
import open from "open";
import { CenteredPage } from "../components/centered-page";
import {
  ModelsDialogContent,
  ProviderDialogContent,
  ThemeDialogContent,
} from "../components/dialogs";
import { useDialog } from "../providers/dialog";
import { getProviderModels, getDefaultModel } from "../lib/models";
import { type ProviderIdType } from "../lib/app-schema";
import {
  clearProviderAuth,
  connectOpenAI,
  connectOpenRouter,
  getProviderAuth,
  isProviderConnected,
} from "../lib/provider-auth";
import { usePromptConfig } from "../providers/prompt-config";
import { useToast } from "../providers/toast";
import { useTheme } from "../providers/theme";

function SelectRow({
  label,
  value,
  actionLabel,
  onSelect,
}: {
  label: string;
  value: string;
  actionLabel: string;
  onSelect: () => void;
}) {
  const { colors } = useTheme();

  return (
    <box
      flexDirection="row"
      alignItems="center"
      justifyContent="space-between"
      width="100%"
      paddingX={2}
      paddingY={1}
      backgroundColor={colors.dialogSurface}
    >
      <box flexDirection="column" gap={0}>
        <text attributes={TextAttributes.DIM}>{label}</text>
        <text>{value}</text>
      </box>
      <text fg={colors.info} onMouseDown={onSelect}>
        [{actionLabel}]
      </text>
    </box>
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const { colors } = useTheme();

  return (
    <box
      flexDirection="column"
      border={["left"]}
      borderColor={colors.primary}
      paddingLeft={2}
      paddingY={1}
      gap={1}
      width="100%"
    >
      <text attributes={TextAttributes.BOLD}>{title}</text>
      {children}
    </box>
  );
}

export function ConfigScreen() {
  const navigate = useNavigate();
  const toast = useToast();
  const dialog = useDialog();
  const { colors, currentTheme } = useTheme();
  const {
    provider,
    setProvider,
    model,
    setModel,
  } = usePromptConfig();
  const [busyProvider, setBusyProvider] = useState<ProviderIdType | null>(null);

  const providerAuth = getProviderAuth(provider);
  const providerModels = useMemo(() => getProviderModels(provider), [provider]);
  const providerLabel = provider === "openai" ? "OpenAI / Codex" : "OpenRouter";
  const providerDescription =
    provider === "openai"
      ? "Browser-first Codex setup with local API key fallback."
      : "OAuth PKCE login with user-controlled API key exchange.";

  const connectCurrentProvider = async () => {
    setBusyProvider(provider);
    try {
      if (provider === "openai") {
        await connectOpenAI();
      } else {
        await connectOpenRouter();
      }
      toast.show({ variant: "success", message: `${providerLabel} connected` });
    } catch (error) {
      toast.show({
        variant: "error",
        message: error instanceof Error ? error.message : `Failed to connect ${providerLabel}`,
      });
    } finally {
      setBusyProvider(null);
    }
  };

  return (
    <CenteredPage
      title="Configuration"
      description="A centered control window for providers, models, themes, and release navigation."
      actions={[
        { label: "Back", onSelect: () => navigate("/"), tone: "muted" },
        { label: "Onboarding", onSelect: () => navigate("/onboarding") },
        { label: "Releases", onSelect: () => navigate("/releases") },
      ]}
      footerHint="select navigate"
    >
      <SectionCard title="Provider">
        <text fg={colors.dimSeparator}>{providerDescription}</text>
        <SelectRow
          label="Active Provider"
          value={providerLabel}
          actionLabel="Select"
          onSelect={() => {
            dialog.open({
              title: "Select Provider",
              children: (
                <ProviderDialogContent
                  onSelectProvider={(nextProvider) => {
                    setProvider(nextProvider);
                    const fallbackModel = getDefaultModel(nextProvider);
                    setModel(fallbackModel.id);
                    toast.show({ message: `Switched to ${nextProvider}` });
                  }}
                />
              ),
            });
          }}
        />
        <SelectRow
          label="Connection"
          value={isProviderConnected(provider) ? "Connected" : "Disconnected"}
          actionLabel={busyProvider === provider ? "Connecting..." : "Connect"}
          onSelect={() => void connectCurrentProvider()}
        />
        <SelectRow
          label="Authentication"
          value={providerAuth.authType ?? "not connected"}
          actionLabel="Disconnect"
          onSelect={() => {
            clearProviderAuth(provider);
            toast.show({ variant: "success", message: `${providerLabel} disconnected` });
          }}
        />
        <SelectRow
          label="Browser"
          value="Open the provider dashboard"
          actionLabel="Open"
          onSelect={() => void open(provider === "openai" ? "https://platform.openai.com/" : "https://openrouter.ai/settings/keys")}
        />
      </SectionCard>

      <SectionCard title="Model">
        <SelectRow
          label="Selected Model"
          value={model}
          actionLabel="Choose"
          onSelect={() => {
            dialog.open({
              title: "Select Model",
              children: (
                <ModelsDialogContent
                  models={providerModels.map((item) => item.id)}
                  onSelectModel={(modelId) => {
                    setModel(modelId);
                    toast.show({ message: `Selected ${modelId}` });
                  }}
                />
              ),
            });
          }}
        />
        <box flexDirection="column" paddingX={2} gap={0}>
          {providerModels.map((item) => (
            <text
              key={item.id}
              attributes={item.id === model ? TextAttributes.BOLD : undefined}
            >
              {item.label} - {item.capability}
            </text>
          ))}
        </box>
      </SectionCard>

      <SectionCard title="Theme">
        <SelectRow
          label="Current Theme"
          value={currentTheme.name}
          actionLabel="Dropdown"
          onSelect={() => {
            dialog.open({
              title: "Select Theme",
              children: <ThemeDialogContent />,
            });
          }}
        />
        <text fg={colors.dimSeparator}>
          All theme layouts are available from the dropdown and preview live.
        </text>
      </SectionCard>
    </CenteredPage>
  );
}
