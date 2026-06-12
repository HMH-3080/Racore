import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { APP_DIR, ensureAppDirectories } from "./app-paths";

export const PERMISSIONS_FILE = join(APP_DIR, "permissions.json");

export type PermissionsConfig = {
  version: number;
  /** When true, every action is auto-approved. Also enabled via RACORE_YOLO=1. */
  yolo: boolean;
  bash: {
    /** Command prefixes/globs that are always allowed, e.g. "npm test*". */
    allow: string[];
    /** Command prefixes/globs that are always denied. Deny wins over allow. */
    deny: string[];
  };
  autoApprove: {
    /** Auto-approve file writes/edits/patches inside the project. */
    edits: boolean;
    /** Auto-approve non-dangerous shell commands. */
    commands: boolean;
  };
};

export type PermissionRequest = {
  kind: "bash" | "write" | "git" | "checkpoint-restore";
  detail: string;
  dangerous?: boolean;
  reason?: string;
};

export type PermissionDecision =
  | { allowed: true }
  | { allowed: false; reason: string };

const DEFAULT_PERMISSIONS: PermissionsConfig = {
  version: 1,
  yolo: false,
  bash: {
    allow: [],
    deny: [],
  },
  autoApprove: {
    edits: true,
    commands: true,
  },
};

const DANGEROUS_COMMAND_RULES: { pattern: RegExp; reason: string }[] = [
  { pattern: /\brm\s+(-[a-z]*r[a-z]*f|-[a-z]*f[a-z]*r)[a-z]*\b/i, reason: "recursive force delete" },
  { pattern: /\brm\s+-[rf]+\s+(\/|~)/i, reason: "delete outside the project" },
  { pattern: /\b(del|rmdir|rd)\s+\/[sq]/i, reason: "recursive delete (Windows)" },
  { pattern: /\bRemove-Item\b[^\n]*-Recurse/i, reason: "recursive delete (PowerShell)" },
  { pattern: /\bgit\s+push\b[^\n]*(--force|-f)\b/i, reason: "force push" },
  { pattern: /\bgit\s+(reset\s+--hard|clean\s+-[a-z]*f)/i, reason: "destructive git operation" },
  { pattern: /\bgit\s+checkout\s+--\s+\./, reason: "discards all local changes" },
  { pattern: /\b(chmod|chown)\s+(-R\s+)?777\b/i, reason: "insecure permissions" },
  { pattern: /\b(curl|wget|iwr|Invoke-WebRequest)\b[^\n]*\|\s*(bash|sh|zsh|powershell|iex)\b/i, reason: "pipes remote content into a shell" },
  { pattern: /\b(shutdown|reboot|halt|poweroff)\b/i, reason: "system power command" },
  { pattern: /\bmkfs|\bdd\s+if=/i, reason: "disk-level operation" },
  { pattern: /\b(export|set|setx)\s+\w*(TOKEN|SECRET|KEY|PASSWORD)\w*=/i, reason: "touches credentials" },
  { pattern: /\b(cat|type|Get-Content)\b[^\n]*(\.env|auth\.json|id_rsa|\.ssh)/i, reason: "reads credential files" },
  { pattern: /\b(npm|yarn|pnpm|bun)\s+publish\b/i, reason: "publishes a package" },
  { pattern: /\bsudo\b/i, reason: "elevated privileges" },
  { pattern: />\s*\/dev\/sd[a-z]/i, reason: "writes to a raw device" },
];

let cachedConfig: PermissionsConfig | null = null;

export function loadPermissions(): PermissionsConfig {
  if (cachedConfig) return cachedConfig;

  try {
    if (existsSync(PERMISSIONS_FILE)) {
      const parsed = JSON.parse(readFileSync(PERMISSIONS_FILE, "utf8")) as Partial<PermissionsConfig>;
      cachedConfig = {
        ...DEFAULT_PERMISSIONS,
        ...parsed,
        bash: {
          allow: parsed.bash?.allow ?? [],
          deny: parsed.bash?.deny ?? [],
        },
        autoApprove: {
          ...DEFAULT_PERMISSIONS.autoApprove,
          ...parsed.autoApprove,
        },
      };
      return cachedConfig;
    }
  } catch {
    // fall through to defaults
  }

  cachedConfig = { ...DEFAULT_PERMISSIONS };
  return cachedConfig;
}

export function savePermissions(config: PermissionsConfig) {
  ensureAppDirectories();
  writeFileSync(PERMISSIONS_FILE, JSON.stringify(config, null, 2), { encoding: "utf8", mode: 0o600 });
  cachedConfig = config;
}

export function resetPermissionsCache() {
  cachedConfig = null;
}

function isYoloEnabled(config: PermissionsConfig) {
  return config.yolo || process.env["RACORE_YOLO"] === "1";
}

/** Simple glob-ish matcher supporting a trailing/inline "*" wildcard. */
export function matchesCommandPattern(command: string, pattern: string): boolean {
  const normalized = command.trim().toLowerCase();
  const escaped = pattern
    .trim()
    .toLowerCase()
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*");
  return new RegExp(`^${escaped}$`).test(normalized) || new RegExp(`^${escaped}(\\s|$)`).test(normalized);
}

export function detectDangerousCommand(command: string): { dangerous: boolean; reason?: string } {
  for (const rule of DANGEROUS_COMMAND_RULES) {
    if (rule.pattern.test(command)) {
      return { dangerous: true, reason: rule.reason };
    }
  }
  return { dangerous: false };
}

type ApprovalHandler = (request: PermissionRequest) => Promise<boolean>;

let approvalHandler: ApprovalHandler | null = null;

/**
 * The TUI (or headless runner) can register an interactive approval handler.
 * When none is registered, dangerous actions are denied with a clear reason.
 */
export function setApprovalHandler(handler: ApprovalHandler | null) {
  approvalHandler = handler;
}

async function askForApproval(request: PermissionRequest): Promise<PermissionDecision> {
  if (!approvalHandler) {
    return {
      allowed: false,
      reason:
        `Blocked (${request.reason ?? "requires approval"}): "${request.detail}". ` +
        "Add an allow rule in ~/.racore/permissions.json or rerun with --yolo to permit it.",
    };
  }

  const approved = await approvalHandler(request);
  return approved
    ? { allowed: true }
    : { allowed: false, reason: `User denied: ${request.detail}` };
}

export async function checkBashPermission(command: string): Promise<PermissionDecision> {
  const config = loadPermissions();

  for (const pattern of config.bash.deny) {
    if (matchesCommandPattern(command, pattern)) {
      return { allowed: false, reason: `Command matches deny rule "${pattern}"` };
    }
  }

  if (isYoloEnabled(config)) return { allowed: true };

  for (const pattern of config.bash.allow) {
    if (matchesCommandPattern(command, pattern)) {
      return { allowed: true };
    }
  }

  const danger = detectDangerousCommand(command);
  if (danger.dangerous) {
    return askForApproval({ kind: "bash", detail: command, dangerous: true, reason: danger.reason });
  }

  if (config.autoApprove.commands) return { allowed: true };
  return askForApproval({ kind: "bash", detail: command });
}

export async function checkWritePermission(path: string): Promise<PermissionDecision> {
  const config = loadPermissions();
  if (isYoloEnabled(config) || config.autoApprove.edits) return { allowed: true };
  return askForApproval({ kind: "write", detail: path });
}
