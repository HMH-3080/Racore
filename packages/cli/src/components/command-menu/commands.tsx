import { getProviderModels } from "../../lib/models";
import { performSelfUpdate } from "../../lib/self-update";
import { emitSessionAction } from "../../lib/session-actions";
import {
  AgentsDialogContent,
  ModelsDialogContent,
  SessionsDialogContent,
  ThemeDialogContent,
} from "../dialogs";
import type { Command } from "./types";

export const COMMANDS: Command[] = [
  {
    name: "new",
    description: "Start a new conversation",
    value: "/new",
    action: (ctx) => {
      ctx.navigate("/");
    },
  },
  {
    name: "config",
    description: "Open provider and model configuration",
    value: "/config",
    action: (ctx) => {
      ctx.navigate("/config");
    },
  },
  {
    name: "onboarding",
    description: "Show setup and npm publish onboarding",
    value: "/onboarding",
    action: (ctx) => {
      ctx.navigate("/onboarding");
    },
  },
  {
    name: "releases",
    description: "Show version history and changelog",
    value: "/releases",
    action: (ctx) => {
      ctx.navigate("/releases");
    },
  },
  {
    name: "update",
    description: "Update the global CLI directly from npm",
    value: "/update",
    action: async (ctx) => {
      ctx.toast.show({ message: "Updating R'a Core from npm..." });
      const result = await performSelfUpdate();
      ctx.toast.show({
        variant: result.ok ? "success" : "error",
        duration: result.ok ? 6000 : 8000,
        message: result.message,
      });
    },
  },
  {
    name: "agents",
    description: "Switch Plan and Build modes",
    value: "/agents",
    action: (ctx) => {
      ctx.dialog.open({
        title: "Select Mode",
        children: <AgentsDialogContent currentMode={ctx.mode} onSelectMode={ctx.setMode} />,
      });
    },
  },
  {
    name: "models",
    description: "Select the current provider model",
    value: "/models",
    action: (ctx) => {
      ctx.dialog.open({
        title: "Select Model",
        children: (
          <ModelsDialogContent
            models={getProviderModels(ctx.provider).map((model) => model.id)}
            onSelectModel={ctx.setModel}
          />
        ),
      });
    },
  },
  {
    name: "sessions",
    description: "Browse past local sessions",
    value: "/sessions",
    action: (ctx) => {
      ctx.dialog.open({
        title: "Sessions",
        children: <SessionsDialogContent />,
      });
    },
  },
  {
    name: "theme",
    description: "Change color theme",
    value: "/theme",
    action: (ctx) => {
      ctx.dialog.open({
        title: "Select Theme",
        children: <ThemeDialogContent />,
      });
    },
  },
  {
    name: "compact",
    description: "Compact the current conversation to free context window",
    value: "/compact",
    action: (ctx) => {
      emitSessionAction("compact");
      ctx.toast.show({ variant: "success", message: "Conversation context compacted" });
    },
  },
  {
    name: "usage",
    description: "View token usage, cost, and session statistics",
    value: "/usage",
    action: (ctx) => {
      ctx.navigate("/usage");
    },
  },
  {
    name: "exit",
    description: "Quit the application",
    value: "/exit",
    action: (ctx) => {
      ctx.exit();
    },
  },
];
