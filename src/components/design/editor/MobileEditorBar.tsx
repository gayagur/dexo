import { BookOpen, Hand, Pencil, Settings2, MessageSquare, Trash2 } from "lucide-react";

interface MobileEditorBarProps {
  onOpenLibrary: () => void;
  onOpenProperties: () => void;
  onOpenChat: () => void;
  editingGroupId: string | null;
  selectedGroupId: string | null;
  selectedPanelId: string | null;
  onEnterEditMode: (groupId: string) => void;
  onExitEditMode: () => void;
  onDeletePanel: (id: string) => void;
  onDeleteGroup: (id: string) => void;
  activeSheet: "library" | "properties" | "chat" | null;
}

export function MobileEditorBar({
  onOpenLibrary, onOpenProperties, onOpenChat,
  editingGroupId, selectedGroupId, selectedPanelId,
  onEnterEditMode, onExitEditMode,
  onDeletePanel, onDeleteGroup, activeSheet,
}: MobileEditorBarProps) {
  const isEditing = !!editingGroupId;
  const canEdit = !!selectedGroupId;
  const hasSelection = !!selectedPanelId || !!selectedGroupId;

  const handleModeToggle = () => {
    if (isEditing) {
      onExitEditMode();
    } else if (selectedGroupId) {
      onEnterEditMode(selectedGroupId);
    }
  };

  const handleDelete = () => {
    if (selectedPanelId) {
      onDeletePanel(selectedPanelId);
    } else if (selectedGroupId) {
      onDeleteGroup(selectedGroupId);
    }
  };

  return (
    <div className="shrink-0 bg-white border-t border-gray-200 safe-area-bottom"
         style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)' }}>
      <div className="h-14 flex items-center justify-around px-2">
        <BarButton icon={BookOpen} label="Library" active={activeSheet === "library"} onClick={onOpenLibrary} />
        <BarButton
          icon={isEditing ? Pencil : Hand}
          label={isEditing ? "Edit" : "Select"}
          active={isEditing}
          onClick={handleModeToggle}
          disabled={!canEdit && !isEditing}
        />
        <BarButton icon={Settings2} label="Properties" active={activeSheet === "properties"} onClick={onOpenProperties} />
        <BarButton
          icon={Trash2}
          label="Delete"
          onClick={handleDelete}
          disabled={!hasSelection}
          destructive
        />
        <BarButton icon={MessageSquare} label="AI" active={activeSheet === "chat"} onClick={onOpenChat} />
      </div>
    </div>
  );
}

function BarButton({
  icon: Icon, label, active, onClick, disabled, destructive,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-col items-center justify-center h-12 w-16 rounded-lg transition-colors ${
        disabled ? "text-gray-300"
          : destructive ? "text-red-500 active:bg-red-50"
          : active ? "text-[#C87D5A]"
          : "text-gray-500 active:bg-gray-100"
      }`}
    >
      <Icon className="w-5 h-5" />
      <span className="text-[10px] mt-0.5 font-medium">{label}</span>
    </button>
  );
}
