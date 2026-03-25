import { useState, useRef, useEffect } from "react";
import {
  Plus,
  Trash2,
  Copy,
  ChevronDown,
  ChevronRight,
  Folder,
  ArrowLeft,
  Pencil,
  Unlink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PanelData, GroupData } from "@/lib/furnitureData";

interface EditorSidebarProps {
  groups: GroupData[];
  ungroupedPanels: PanelData[];
  editingGroupId: string | null;
  editingPanels: PanelData[] | null;
  selectedPanelId: string | null;
  selectedGroupId: string | null;
  onSelectPanel: (id: string | null) => void;
  onSelectGroup: (id: string | null) => void;
  onAddPanel: () => void;
  onDuplicatePanel: (id: string) => void;
  onDeletePanel: (id: string) => void;
  onDeleteGroup: (id: string) => void;
  onEnterEditMode: (groupId: string) => void;
  onExitEditMode: () => void;
  onRenameGroup: (groupId: string, name: string) => void;
  onGroupPanels: (name: string) => void;
  onUngroupGroup: (groupId: string) => void;
}

/* ── Inline rename input ─────────────────────────────────────────────── */

function InlineRename({
  value,
  onCommit,
  onCancel,
}: {
  value: string;
  onCommit: (v: string) => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [text, setText] = useState(value);

  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  const commit = () => {
    const trimmed = text.trim();
    if (trimmed && trimmed !== value) onCommit(trimmed);
    else onCancel();
  };

  return (
    <input
      ref={ref}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") onCancel();
      }}
      className="flex-1 text-xs bg-white border border-blue-400 rounded px-1 py-0.5 outline-none"
    />
  );
}

/* ── Panel row (used in both modes) ──────────────────────────────────── */

function PanelRow({
  panel,
  selected,
  readOnly,
  onSelect,
  onDuplicate,
  onDelete,
}: {
  panel: PanelData;
  selected: boolean;
  readOnly?: boolean;
  onSelect?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`w-full flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-left text-sm transition-colors group ${
        selected
          ? "bg-[#C87D5A]/10 text-[#C87D5A]"
          : readOnly
          ? "text-gray-500 cursor-default"
          : "text-gray-700 hover:bg-gray-50"
      }`}
    >
      <span className="flex-1 truncate text-xs">
        {panel.label}
        {panel.shape && panel.shape !== "box" && (
          <span className="text-[9px] text-gray-400 ml-1 capitalize">
            ({panel.shape.replace(/_/g, " ")})
          </span>
        )}
      </span>
      {!readOnly && onDuplicate && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate();
          }}
          title="Duplicate (Ctrl+D)"
          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-[#C87D5A] transition-all"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>
      )}
      {!readOnly && onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          title="Delete (Del)"
          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </button>
  );
}

/* ── Group row (scene mode) ──────────────────────────────────────────── */

function GroupRow({
  group,
  selected,
  onSelect,
  onEnterEdit,
  onRename,
  onUngroup,
  onDelete,
}: {
  group: GroupData;
  selected: boolean;
  onSelect: () => void;
  onEnterEdit: () => void;
  onRename: (name: string) => void;
  onUngroup: () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [renaming, setRenaming] = useState(false);

  return (
    <div>
      {/* Group header row */}
      <div
        onClick={onSelect}
        onDoubleClick={onEnterEdit}
        className={`w-full flex items-center gap-1.5 px-2 py-2 rounded-lg text-left text-sm transition-colors cursor-pointer group ${
          selected ? "bg-blue-50 text-blue-600" : "text-gray-700 hover:bg-gray-50"
        }`}
      >
        {/* Expand/collapse chevron */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((v) => !v);
          }}
          className="shrink-0 text-gray-400 hover:text-gray-600"
        >
          {expanded ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5" />
          )}
        </button>

        <Folder className="w-3.5 h-3.5 shrink-0 text-gray-400" />

        {/* Name or inline rename */}
        {renaming ? (
          <InlineRename
            value={group.name}
            onCommit={(v) => {
              onRename(v);
              setRenaming(false);
            }}
            onCancel={() => setRenaming(false)}
          />
        ) : (
          <span
            className="flex-1 truncate text-xs font-medium"
            onClick={(e) => {
              e.stopPropagation();
              setRenaming(true);
            }}
          >
            {group.name}
          </span>
        )}

        {/* Context actions on hover */}
        {!renaming && (
          <span className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEnterEdit();
              }}
              title="Edit group"
              className="text-gray-400 hover:text-blue-500"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUngroup();
              }}
              title="Ungroup"
              className="text-gray-400 hover:text-orange-500"
            >
              <Unlink className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              title="Delete group"
              className="text-gray-400 hover:text-red-500"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </span>
        )}
      </div>

      {/* Expanded child panels (read-only) */}
      {expanded && (
        <div className="ml-6 space-y-0.5">
          {group.panels.map((panel) => (
            <PanelRow key={panel.id} panel={panel} selected={false} readOnly />
          ))}
          {group.panels.length === 0 && (
            <p className="text-[10px] text-gray-400 px-2 py-1">No panels</p>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Main sidebar ────────────────────────────────────────────────────── */

export function EditorSidebar({
  groups,
  ungroupedPanels,
  editingGroupId,
  editingPanels,
  selectedPanelId,
  selectedGroupId,
  onSelectPanel,
  onSelectGroup,
  onAddPanel,
  onDuplicatePanel,
  onDeletePanel,
  onDeleteGroup,
  onEnterEditMode,
  onExitEditMode,
  onRenameGroup,
  onGroupPanels,
  onUngroupGroup,
}: EditorSidebarProps) {
  const editingGroup = editingGroupId
    ? groups.find((g) => g.id === editingGroupId)
    : null;

  /* ── Edit Mode ─────────────────────────────────────────────────────── */
  if (editingGroupId && editingPanels) {
    return (
      <div className="w-64 shrink-0 bg-white border-r border-gray-200 flex flex-col h-full">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
          <button
            onClick={onExitEditMode}
            className="text-gray-500 hover:text-gray-800 transition-colors"
            title="Back to Scene"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h3 className="text-sm font-semibold text-gray-900 flex-1 truncate">
            {editingGroup?.name ?? "Group"}
          </h3>
          <Button variant="ghost" size="sm" onClick={onAddPanel} className="h-7 px-2">
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add
          </Button>
        </div>

        {/* Panel list (flat, no type grouping) */}
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {editingPanels.map((panel) => (
            <PanelRow
              key={panel.id}
              panel={panel}
              selected={panel.id === selectedPanelId}
              onSelect={() => onSelectPanel(panel.id)}
              onDuplicate={() => onDuplicatePanel(panel.id)}
              onDelete={() => onDeletePanel(panel.id)}
            />
          ))}
          {editingPanels.length === 0 && (
            <div className="text-center py-8 text-xs text-gray-400">
              No panels in this group. Click Add to create one.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-gray-100 text-[11px] text-gray-400">
          {editingPanels.length} panel{editingPanels.length !== 1 ? "s" : ""} in group
        </div>
      </div>
    );
  }

  /* ── Scene Mode ────────────────────────────────────────────────────── */
  return (
    <div className="w-64 shrink-0 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Objects</h3>
        <Button variant="ghost" size="sm" onClick={onAddPanel} className="h-7 px-2">
          <Plus className="w-3.5 h-3.5 mr-1" />
          Add
        </Button>
      </div>

      {/* Object list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {/* Groups */}
        {groups.map((group) => (
          <GroupRow
            key={group.id}
            group={group}
            selected={group.id === selectedGroupId}
            onSelect={() => onSelectGroup(group.id)}
            onEnterEdit={() => onEnterEditMode(group.id)}
            onRename={(name) => onRenameGroup(group.id, name)}
            onUngroup={() => onUngroupGroup(group.id)}
            onDelete={() => onDeleteGroup(group.id)}
          />
        ))}

        {/* Ungrouped panels */}
        {ungroupedPanels.length > 0 && (
          <div>
            <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider px-2 mb-1.5 mt-3">
              Ungrouped
            </p>
            <div className="space-y-0.5">
              {ungroupedPanels.map((panel) => (
                <PanelRow
                  key={panel.id}
                  panel={panel}
                  selected={panel.id === selectedPanelId}
                  onSelect={() => onSelectPanel(panel.id)}
                  onDuplicate={() => onDuplicatePanel(panel.id)}
                  onDelete={() => onDeletePanel(panel.id)}
                />
              ))}
            </div>
          </div>
        )}

        {groups.length === 0 && ungroupedPanels.length === 0 && (
          <div className="text-center py-8 text-xs text-gray-400">
            No objects yet. Click Add to start building.
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-gray-100 text-[11px] text-gray-400">
        {groups.length} group{groups.length !== 1 ? "s" : ""}
        {ungroupedPanels.length > 0 && (
          <>, {ungroupedPanels.length} ungrouped</>
        )}
      </div>
    </div>
  );
}
