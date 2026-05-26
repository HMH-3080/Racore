import { useCallback } from "react";
import { useDialog } from "../../providers/dialog";
import { DialogSearchList } from "../dialog-search-list";

type ModelsDialogContentProps = {
  models: string[];
  onSelectModel: (modelId: string) => void;
};

export const ModelsDialogContent = ({ 
  models, 
  onSelectModel 
}: ModelsDialogContentProps) => {
  const dialog = useDialog();

  const handleSelect = useCallback(
    (modelId: string) => {
      onSelectModel(modelId);
      dialog.close();
    },
    [dialog, onSelectModel],
  );

  return (
    <DialogSearchList
      items={models}
      onSelect={handleSelect}
      filterFn={(modelId, query) => modelId.toLowerCase().includes(query.toLowerCase())}
      renderItem={(modelId, isSelected) => (
        <text selectable={false} fg={isSelected ? "black" : "white"}>
          {modelId}
        </text>
      )}
      getKey={(modelId) => modelId}
      placeholder="Search models"
      emptyText="No matching models"
    />
  );
};
