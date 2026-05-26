import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { SESSIONS_DIR, ensureAppDirectories } from "./app-paths";
import type { ChatMessage, SessionRecord } from "./app-schema";

function getSessionPath(id: string) {
  return join(SESSIONS_DIR, `${id}.json`);
}

export function listSessions(): SessionRecord[] {
  ensureAppDirectories();
  const files = existsSync(SESSIONS_DIR) ? readdirSync(SESSIONS_DIR) : [];

  return files
    .filter((file) => file.endsWith(".json"))
    .map((file) => {
      try {
        return JSON.parse(readFileSync(join(SESSIONS_DIR, file), "utf8")) as SessionRecord;
      } catch {
        return null;
      }
    })
    .filter((session): session is SessionRecord => session !== null)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export function getSession(id: string) {
  try {
    return JSON.parse(readFileSync(getSessionPath(id), "utf8")) as SessionRecord;
  } catch {
    return null;
  }
}

export function createSession(title: string) {
  ensureAppDirectories();
  const now = new Date().toISOString();
  const session: SessionRecord = {
    id: crypto.randomUUID(),
    title,
    createdAt: now,
    updatedAt: now,
    messages: [],
  };
  saveSession(session);
  return session;
}

export function saveSession(session: SessionRecord) {
  ensureAppDirectories();
  const nextSession = { ...session, updatedAt: new Date().toISOString() };
  writeFileSync(getSessionPath(session.id), JSON.stringify(nextSession, null, 2), "utf8");
  return nextSession;
}

export function appendMessages(sessionId: string, messages: ChatMessage[]) {
  const session = getSession(sessionId);
  if (!session) {
    throw new Error("Session not found");
  }

  session.messages = messages;
  return saveSession(session);
}
