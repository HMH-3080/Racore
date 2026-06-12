/**
 * Tiny event bus so global commands (e.g. /compact from the command menu)
 * can reach the currently active session's chat state.
 */
export type SessionAction = "compact";

type Listener = (action: SessionAction) => void;

let listeners: Listener[] = [];

export function emitSessionAction(action: SessionAction) {
  for (const listener of listeners) {
    listener(action);
  }
}

export function onSessionAction(listener: Listener) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((candidate) => candidate !== listener);
  };
}
