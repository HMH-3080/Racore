import { useEffect, useState } from "react";
import { TextAttributes } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import { useKeyboardLayer } from "../../providers/keyboard-layer";
import { useTheme } from "../../providers/theme";
import type { PermissionRequest } from "../../lib/permissions";

export type ApprovalDecision = "once" | "always" | "deny";

type ApprovalOption = {
  decision: ApprovalDecision;
  label: string;
  hint: string;
};

const OPTIONS: ApprovalOption[] = [
  { decision: "once", label: "Allow once", hint: "y" },
  { decision: "always", label: "Always allow", hint: "a" },
  { decision: "deny", label: "Deny", hint: "n" },
];

type ApprovalDialogContentProps = {
  request: PermissionRequest;
  onDecide: (decision: ApprovalDecision) => void;
  onDismiss: () => void;
};

export function ApprovalDialogContent({ request, onDecide, onDismiss }: ApprovalDialogContentProps) {
  const { colors } = useTheme();
  const { isTopLayer } = useKeyboardLayer();
  const [selectedIndex, setSelectedIndex] = useState(0);

  // If the dialog is closed without a decision (escape / click-away),
  // treat it as a denial so the agent loop never hangs.
  useEffect(() => onDismiss, [onDismiss]);

  useKeyboard((key) => {
    if (!isTopLayer("dialog")) return;

    if (key.name === "up") {
      key.preventDefault();
      setSelectedIndex((index) => Math.max(0, index - 1));
    } else if (key.name === "down") {
      key.preventDefault();
      setSelectedIndex((index) => Math.min(OPTIONS.length - 1, index + 1));
    } else if (key.name === "return" || key.name === "enter") {
      key.preventDefault();
      onDecide(OPTIONS[selectedIndex]!.decision);
    } else if (key.name === "y") {
      key.preventDefault();
      onDecide("once");
    } else if (key.name === "a") {
      key.preventDefault();
      onDecide("always");
    } else if (key.name === "n") {
      key.preventDefault();
      onDecide("deny");
    }
  });

  return (
    <box flexDirection="column" gap={1}>
      {request.reason ? (
        <text fg={colors.error ?? "red"}>Reason: {request.reason}</text>
      ) : null}
      <box paddingX={1} backgroundColor={colors.surface}>
        <text wrapMode="word">{request.detail}</text>
      </box>
      <box flexDirection="column">
        {OPTIONS.map((option, index) => {
          const isSelected = index === selectedIndex;
          return (
            <box
              key={option.decision}
              flexDirection="row"
              paddingX={1}
              height={1}
              backgroundColor={isSelected ? colors.selection : undefined}
              onMouseMove={() => setSelectedIndex(index)}
              onMouseDown={() => onDecide(option.decision)}
            >
              <box flexGrow={1}>
                <text selectable={false} fg={isSelected ? "black" : "white"}>
                  {option.label}
                </text>
              </box>
              <text selectable={false} attributes={TextAttributes.DIM} fg={isSelected ? "black" : "gray"}>
                {option.hint}
              </text>
            </box>
          );
        })}
      </box>
      <text attributes={TextAttributes.DIM}>up/down + enter, or y / a / n. esc denies.</text>
    </box>
  );
}
