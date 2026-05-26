import { useCallback, useMemo } from "react";
import { TextAttributes } from "@opentui/core";
import { format } from "date-fns";
import { useNavigate } from "react-router";
import { useDialog } from "../../providers/dialog";
import { DialogSearchList } from "../dialog-search-list";
import { listSessions } from "../../lib/session-store";

export const SessionsDialogContent = () => {
  const sessions = useMemo(() => listSessions(), []);
  const { close } = useDialog();
  const navigate = useNavigate();

  const handleSelect = useCallback(
    (session: ReturnType<typeof listSessions>[number]) => {
      close();
      navigate(`/sessions/${session.id}`);
    },
    [close, navigate],
  );

  return (
    <DialogSearchList
      items={sessions}
      onSelect={handleSelect}
      filterFn={(session, query) => session.title.toLowerCase().includes(query.toLowerCase())}
      renderItem={(session, isSelected) => (
        <>
          <text selectable={false} fg={isSelected ? "black" : "white"}>
            {session.title}
          </text>
          <box flexGrow={1} />
          <text
            selectable={false}
            fg={isSelected ? "black" : undefined}
            attributes={TextAttributes.DIM}
          >
            {format(new Date(session.createdAt), "hh:mm a")}
          </text>
        </>
      )}
      getKey={(session) => session.id}
      placeholder="Search sessions"
      emptyText="No matching sessions"
    />
  );
}
