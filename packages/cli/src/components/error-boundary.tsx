import { Component, type ErrorInfo, type ReactNode } from "react";
import { TextAttributes } from "@opentui/core";
import { EmptyBorder } from "./border";
import { useTheme } from "../providers/theme";

type Props = {
  children: ReactNode;
};

type State = {
  error: Error | null;
  componentStack: string;
};

function formatUnknownError(error: unknown): Error {
  if (error instanceof Error) return error;
  return new Error(String(error));
}

function FatalErrorPanel({ error, componentStack }: { error: Error; componentStack: string }) {
  const { colors } = useTheme();
  const stack = [error.stack, componentStack ? `React component stack:\n${componentStack}` : ""]
    .filter(Boolean)
    .join("\n\n");

  return (
    <box
      backgroundColor={colors.background}
      width="100%"
      height="100%"
      flexGrow={1}
      paddingX={2}
      paddingY={1}
    >
      <box
        border={["left"]}
        borderColor={colors.error}
        customBorderChars={{ ...EmptyBorder, vertical: "┃" }}
        width="100%"
        backgroundColor={colors.surface}
        paddingX={2}
        paddingY={1}
      >
        <box flexDirection="column" gap={1} width="100%">
          <text fg={colors.error} attributes={TextAttributes.BOLD}>
            Render error
          </text>
          <text fg={colors.error} wrapMode="word">
            {error.message}
          </text>
          <text attributes={TextAttributes.DIM} wrapMode="word">
            The interface caught this error instead of exiting. Fix the details below, then restart racore.
          </text>
          {stack ? (
            <box flexDirection="column" gap={0} width="100%" paddingTop={1}>
              <text attributes={TextAttributes.DIM}>Details</text>
              <text fg={colors.error} attributes={TextAttributes.DIM} wrapMode="word">
                {stack}
              </text>
            </box>
          ) : null}
        </box>
      </box>
    </box>
  );
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = {
    error: null,
    componentStack: "",
  };

  static getDerivedStateFromError(error: unknown): Partial<State> {
    return { error: formatUnknownError(error) };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    this.setState({
      error: formatUnknownError(error),
      componentStack: info.componentStack ?? "",
    });
  }

  render() {
    if (this.state.error) {
      return (
        <FatalErrorPanel
          error={this.state.error}
          componentStack={this.state.componentStack}
        />
      );
    }

    return this.props.children;
  }
}
