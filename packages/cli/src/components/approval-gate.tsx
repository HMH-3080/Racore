import { useEffect } from "react";
import { useDialog } from "../providers/dialog";
import { ApprovalDialogContent, type ApprovalDecision } from "./dialogs/approval-dialog";
import {
  loadPermissions,
  savePermissions,
  setApprovalHandler,
  type PermissionRequest,
} from "../lib/permissions";

/** Derive a reusable allow pattern from a concrete command, e.g. "git push *". */
function toAllowPattern(command: string): string {
  const words = command.trim().split(/\s+/);
  return words.length <= 2 ? `${words.join(" ")}*` : `${words.slice(0, 2).join(" ")} *`;
}

function persistAlwaysRule(request: PermissionRequest) {
  const config = loadPermissions();

  if (request.kind === "bash" || request.kind === "git") {
    config.bash.allow = [...config.bash.allow, toAllowPattern(request.detail)];
  } else if (request.kind === "write") {
    config.autoApprove.edits = true;
  }

  savePermissions(config);
}

/**
 * Bridges the permission engine to the TUI: registers an interactive
 * approval handler that opens a dialog with allow once / always / deny.
 * Renders nothing; mount once inside the dialog provider.
 */
export function ApprovalGate() {
  const dialog = useDialog();

  useEffect(() => {
    setApprovalHandler((request) => new Promise<boolean>((resolve) => {
      let settled = false;

      const settle = (approved: boolean) => {
        if (settled) return;
        settled = true;
        resolve(approved);
      };

      const handleDecide = (decision: ApprovalDecision) => {
        if (decision === "always") persistAlwaysRule(request);
        dialog.close();
        settle(decision !== "deny");
      };

      dialog.open({
        title: request.dangerous ? "Dangerous action - approval required" : "Approval required",
        children: (
          <ApprovalDialogContent
            request={request}
            onDecide={handleDecide}
            onDismiss={() => settle(false)}
          />
        ),
      });
    }));

    return () => setApprovalHandler(null);
  }, [dialog]);

  return null;
}
