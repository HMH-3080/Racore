import { useTheme } from "../providers/theme";
import { useTodos } from "../lib/use-todos";

const STATUS_ICONS: Record<string, string> = {
  pending: "\u25A1",
  in_progress: "\u25C7",
  completed: "\u2713",
  cancelled: "\u2717",
};

function shortTitle(title: string) {
  return title.length > 26 ? title.slice(0, 23) + "..." : title;
}

function statusColor(status: string, colors: Record<string, string>) {
  switch (status) {
    case "completed":
      return colors.success;
    case "in_progress":
      return colors.primary;
    case "cancelled":
      return colors.error;
    default:
      return colors.dimSeparator;
  }
}

export function TodoPanel() {
  const { colors } = useTheme();
  const { todos, clearTodos } = useTodos();

  return (
    <box
      width={28}
      height="100%"
      flexShrink={0}
      flexDirection="column"
      backgroundColor={colors.dialogSurface}
      paddingX={1}
      paddingY={1}
      gap={1}
      border={["left"]}
      borderColor={colors.dimSeparator}
    >
      <box flexDirection="row" alignItems="center" justifyContent="space-between" width="100%" paddingX={1}>
        <text attributes={{ bold: true }}>Tasks</text>
        {todos.length > 0 ? (
          <text fg={colors.dimSeparator} onMouseDown={clearTodos}>
            [clear]
          </text>
        ) : null}
      </box>

      {todos.length === 0 ? (
        <box paddingX={1} paddingY={1}>
          <text fg={colors.dimSeparator}>No tasks yet</text>
        </box>
      ) : (
        <scrollbox flexGrow={1} width="100%">
          <box flexDirection="column" gap={1} width="100%">
            {todos.map((todo) => (
              <box
                key={todo.id}
                width="100%"
                flexDirection="row"
                gap={1}
                paddingX={1}
                paddingY={0}
                overflow="hidden"
              >
                <text fg={statusColor(todo.status, colors)} selectable={false}>
                  {STATUS_ICONS[todo.status] || STATUS_ICONS.pending}
                </text>
                <text
                  fg={todo.status === "completed" || todo.status === "cancelled" ? colors.dimSeparator : undefined}
                  attributes={
                    todo.status === "completed" || todo.status === "cancelled"
                      ? { dim: true }
                      : {}
                  }
                  overflow="hidden"
                >
                  {shortTitle(todo.title)}
                </text>
              </box>
            ))}
          </box>
        </scrollbox>
      )}

      <box paddingX={1} flexDirection="column" gap={0}>
        <text fg={colors.dimSeparator} attributes={{ dim: true }}>
          {STATUS_ICONS.pending} pending
        </text>
        <text fg={colors.primary} attributes={{ dim: true }}>
          {STATUS_ICONS.in_progress} in progress
        </text>
        <text fg={colors.success} attributes={{ dim: true }}>
          {STATUS_ICONS.completed} done
        </text>
      </box>
    </box>
  );
}
