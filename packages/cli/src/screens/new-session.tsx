import { useEffect, useMemo, useRef } from "react";
import { z } from "zod";
import { useNavigate, useLocation } from "react-router";
import { Mode, modeSchema } from "../lib/app-schema";
import { createSession } from "../lib/session-store";
import { SessionShell } from "../components/session-shell";
import { UserMessage } from "../components/messages";

const newSessionStateSchema = z.object({
  message: z.string(),
  mode: modeSchema.default(Mode.BUILD),
  model: z.string(),
});

export function NewSession() {
  const navigate = useNavigate();
  const location = useLocation();
  const hasStartedRef = useRef(false);

  const state = useMemo(() => {
    const parsed = newSessionStateSchema.safeParse(location.state);
    return parsed.success ? parsed.data : null;
  }, [location.state]);

  useEffect(() => {
    if (!state || hasStartedRef.current) {
      if (!state) {
        navigate("/", { replace: true });
      }
      return;
    }

    hasStartedRef.current = true;
    const session = createSession(state.message.slice(0, 100));
    navigate(`/sessions/${session.id}`, {
      replace: true,
      state: { session, initialPrompt: state },
    });
  }, [navigate, state]);

  if (!state) return null;

  return (
    <SessionShell onSubmit={() => {}} inputDisabled loading>
      <UserMessage message={state.message} mode={state.mode} />
    </SessionShell>
  );
}
