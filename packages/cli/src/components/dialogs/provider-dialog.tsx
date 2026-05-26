import { useCallback } from "react";
import { useDialog } from "../../providers/dialog";
import { DialogSearchList } from "../dialog-search-list";
import { ProviderId, type ProviderIdType } from "../../lib/app-schema";

const PROVIDERS: { id: ProviderIdType; label: string; hint: string }[] = [
  {
    id: ProviderId.OPENAI,
    label: "OpenAI / Codex",
    hint: "Direct OpenAI-compatible provider",
  },
  {
    id: ProviderId.OPENROUTER,
    label: "OpenRouter",
    hint: "Unified model routing",
  },
];

type Props = {
  onSelectProvider: (provider: ProviderIdType) => void;
};

export function ProviderDialogContent({ onSelectProvider }: Props) {
  const dialog = useDialog();

  const handleSelect = useCallback((item: (typeof PROVIDERS)[number]) => {
    onSelectProvider(item.id);
    dialog.close();
  }, [dialog, onSelectProvider]);

  return (
    <DialogSearchList
      items={PROVIDERS}
      onSelect={handleSelect}
      filterFn={(item, query) =>
        item.label.toLowerCase().includes(query.toLowerCase())
        || item.hint.toLowerCase().includes(query.toLowerCase())
      }
      renderItem={(item, isSelected) => (
        <box flexDirection="row" width="100%" paddingX={1}>
          <text selectable={false} fg={isSelected ? "black" : "white"}>
            {item.label}
          </text>
          <box flexGrow={1} />
          <text selectable={false} fg={isSelected ? "black" : "gray"}>
            {item.hint}
          </text>
        </box>
      )}
      getKey={(item) => item.id}
      placeholder="Search providers"
      emptyText="No matching providers"
    />
  );
}
