import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { APP_DIR } from "./app-paths";

export const CHECKPOINTS_DIR = join(APP_DIR, "checkpoints");

const MAX_CHECKPOINTS = 50;

export type CheckpointEntry = {
  /** Project-relative path of the touched file. */
  path: string;
  /** Whether the file existed before the agent touched it. */
  existed: boolean;
  /** Snapshot file name inside the checkpoint dir (when existed). */
  snapshot?: string;
};

export type CheckpointManifest = {
  id: string;
  label: string;
  createdAt: string;
  cwd: string;
  entries: CheckpointEntry[];
};

let activeCheckpoint: CheckpointManifest | null = null;

function manifestPath(id: string) {
  return join(CHECKPOINTS_DIR, id, "manifest.json");
}

function persistManifest(manifest: CheckpointManifest) {
  mkdirSync(join(CHECKPOINTS_DIR, manifest.id), { recursive: true, mode: 0o700 });
  writeFileSync(manifestPath(manifest.id), JSON.stringify(manifest, null, 2), "utf8");
}

function pruneOldCheckpoints() {
  if (!existsSync(CHECKPOINTS_DIR)) return;
  const ids = readdirSync(CHECKPOINTS_DIR).sort();
  while (ids.length > MAX_CHECKPOINTS) {
    const oldest = ids.shift();
    if (oldest) rmSync(join(CHECKPOINTS_DIR, oldest), { recursive: true, force: true });
  }
}

/**
 * Start a new checkpoint "turn". All file snapshots taken until the next
 * beginCheckpoint call are grouped together so the whole agent turn can be
 * rolled back atomically.
 */
export function beginCheckpoint(label: string): string {
  const id = `${new Date().toISOString().replace(/[:.]/g, "-")}-${crypto.randomUUID().slice(0, 8)}`;
  activeCheckpoint = {
    id,
    label: label.slice(0, 120),
    createdAt: new Date().toISOString(),
    cwd: process.cwd(),
    entries: [],
  };
  pruneOldCheckpoints();
  return id;
}

/**
 * Snapshot a file's pre-edit content. Only the first snapshot per path per
 * checkpoint is kept, so repeated edits in one turn restore to the turn start.
 */
export async function snapshotBeforeWrite(relPath: string, previousContent: string | null) {
  if (!activeCheckpoint) beginCheckpoint("untracked turn");
  const checkpoint = activeCheckpoint!;

  if (checkpoint.entries.some((entry) => entry.path === relPath)) return;

  const entry: CheckpointEntry = {
    path: relPath,
    existed: previousContent !== null,
  };

  if (previousContent !== null) {
    const snapshotName = `${createHash("sha1").update(relPath).digest("hex").slice(0, 12)}.snapshot`;
    const dir = join(CHECKPOINTS_DIR, checkpoint.id);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, snapshotName), previousContent, "utf8");
    entry.snapshot = snapshotName;
  }

  checkpoint.entries.push(entry);
  persistManifest(checkpoint);
}

export function listCheckpoints(limit = 20): CheckpointManifest[] {
  if (!existsSync(CHECKPOINTS_DIR)) return [];

  return readdirSync(CHECKPOINTS_DIR)
    .map((id) => {
      try {
        return JSON.parse(readFileSync(manifestPath(id), "utf8")) as CheckpointManifest;
      } catch {
        return null;
      }
    })
    .filter((manifest): manifest is CheckpointManifest => manifest !== null && manifest.entries.length > 0)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, limit);
}

export type RestoreResult = {
  id: string;
  restored: string[];
  deleted: string[];
  errors: string[];
};

/**
 * Restore the project files captured in a checkpoint. Files that did not
 * exist before the turn are deleted; modified files get their old content back.
 */
export async function restoreCheckpoint(id?: string): Promise<RestoreResult> {
  const manifest = id
    ? listCheckpoints(MAX_CHECKPOINTS).find((checkpoint) => checkpoint.id === id)
    : listCheckpoints(1)[0];

  if (!manifest) {
    throw new Error(id ? `Checkpoint "${id}" not found` : "No checkpoints available");
  }

  const result: RestoreResult = { id: manifest.id, restored: [], deleted: [], errors: [] };

  for (const entry of manifest.entries) {
    const target = resolve(manifest.cwd, entry.path);
    try {
      if (!entry.existed) {
        rmSync(target, { force: true });
        result.deleted.push(entry.path);
        continue;
      }
      if (!entry.snapshot) {
        result.errors.push(`${entry.path}: snapshot missing`);
        continue;
      }
      const content = readFileSync(join(CHECKPOINTS_DIR, manifest.id, entry.snapshot), "utf8");
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, content, "utf8");
      result.restored.push(entry.path);
    } catch (error) {
      result.errors.push(`${entry.path}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return result;
}
