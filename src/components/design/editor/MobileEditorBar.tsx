import { BookOpen, Hand, Pencil, Settings2, MessageSquare } from "lucide-react";

interface MobileEditorBarProps {
  onOpenLibrary: () => void;
  onOpenProperties: () => void;
  onOpenChat: () => void;
  editingGroupId: string | null;
  selectedGroupId: string | null;
  onEnterEditMode: (groupId: string) => void;
  onExitEditMode: () => void;
  activeSheet: "library" | "properties" | "chat" | null;
}

export function MobileEditorBar({
  onOpenLibrary, onOpenProperties, onOpenChat,
  editingGroupId, selectedGroupId,
  onEnterEditMode, onExitEditMode, activeSheet,
}: MobileEditorBarProps) {
  const isEditing = !!editingGroupId;
  const canEdit = !!selectedGroupId;

  const handleModeToggle = () => {
    if (isEditing) {
      onExitEditMode();
    } else if (selectedGroupId) {
      onEnterEditMode(selectedGroupId);
    }
  };

  return (
    <div className="shrink-0 bg-white border-t border-gray-200 safe-area-bottom">
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
        <BarButton icon={MessageSquare} label="AI" active={activeSheet === "chat"} onClick={onOpenChat} />
      </div>
    </div>
  );
}

function BarButton({
  icon: Icon, label, active, onClick, disabled,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-col items-center justify-center h-12 w-16 rounded-lg transition-colors ${
        active ? "text-[#C87D5A]"
          : disabled ? "text-gray-300"
          : "text-gray-500 active:bg-gray-100"
      }`}
    >
      <Icon className="w-5 h-5" />
      <span className="text-[10px] mt-0.5 font-medium">{label}</span>
    </button>
  );
}
