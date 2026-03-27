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
  Search,
} from "lucide-react";
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
      className={`w-full flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-left text-sm transition-colors group min-h-[44px] ${
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
          className="flex items-center justify-center min-h-[44px] min-w-[44px] opacity-0 group-hover:opacity-100 text-gray-400 hover:text-[#C87D5A] transition-all"
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
          className="flex items-center justify-center min-h-[44px] min-w-[44px] opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all"
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
        className={`w-full flex items-center gap-1.5 px-2 py-2 rounded-lg text-left text-sm transition-colors cursor-pointer group min-h-[44px] ${
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
              className="flex items-center justify-center min-h-[44px] min-w-[44px] text-gray-400 hover:text-blue-500"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUngroup();
              }}
              title="Ungroup"
              className="flex items-center justify-center min-h-[44px] min-w-[44px] text-gray-400 hover:text-orange-500"
            >
              <Unlink className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              title="Delete group"
              className="flex items-center justify-center min-h-[44px] min-w-[44px] text-gray-400 hover:text-red-500"
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

  const [searchQuery, setSearchQuery] = useState("");

  const filteredGroups = groups.filter(
    (g) =>
      !searchQuery ||
      g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.panels.some((p) => p.label.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  const filteredUngrouped = ungroupedPanels.filter(
    (p) => !searchQuery || p.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  /* ── Search input (shared) ──────────────────────────────────────────── */
  const searchInput = (
    <div className="px-3 py-2 border-b border-gray-100">
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
        <input
          type="text"
          placeholder="Search objects..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-7 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-[#C87D5A]/40 focus:bg-white transition-colors"
        />
      </div>
    </div>
  );

  /* ── Add button (shared, sticky bottom) ────────────────────────────── */
  const addButton = (
    <div className="sticky bottom-0 px-3 py-2 border-t border-gray-100 bg-white">
      <button
        onClick={onAddPanel}
        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-[#C87D5A] bg-[#C87D5A]/5 hover:bg-[#C87D5A]/10 border border-[#C87D5A]/20 rounded-lg transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
        Add Part
      </button>
    </div>
  );

  /* ── Edit Mode ─────────────────────────────────────────────────────── */
  if (editingGroupId && editingPanels) {
    const filteredEditingPanels = editingPanels.filter(
      (p) => !searchQuery || p.label.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
      <div className="w-full lg:w-64 shrink-0 bg-white border-r border-gray-200 flex flex-col h-full">
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
        </div>

        {/* Search */}
        {searchInput}

        {/* Panel list (flat, no type grouping) */}
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {filteredEditingPanels.map((panel) => (
            <PanelRow
              key={panel.id}
              panel={panel}
              selected={panel.id === selectedPanelId}
              onSelect={() => onSelectPanel(panel.id)}
              onDuplicate={() => onDuplicatePanel(panel.id)}
              onDelete={() => onDeletePanel(panel.id)}
            />
          ))}
          {filteredEditingPanels.length === 0 && (
            <div className="text-center py-8 text-xs text-gray-400">
              {searchQuery ? "No matching panels." : "No panels in this group. Click Add to create one."}
            </div>
          )}
        </div>

        {/* Sticky Add button */}
        {addButton}
      </div>
    );
  }

  /* ── Scene Mode ────────────────────────────────────────────────────── */
  return (
    <div className="w-full lg:w-64 shrink-0 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Slim section label */}
      <div className="px-3 pt-2 pb-1">
        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Scene</span>
      </div>

      {/* Search */}
      {searchInput}

      {/* Object list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {/* Groups */}
        {filteredGroups.map((group) => (
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
        {filteredUngrouped.length > 0 && (
          <div>
            <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider px-2 mb-1.5 mt-3">
              Ungrouped
            </p>
            <div className="space-y-0.5">
              {filteredUngrouped.map((panel) => (
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

        {filteredGroups.length === 0 && filteredUngrouped.length === 0 && (
          <div className="text-center py-8 text-xs text-gray-400">
            {searchQuery ? "No matching objects." : "No objects yet. Click Add to start building."}
          </div>
        )}
      </div>

      {/* Sticky Add button */}
      {addButton}
    </div>
  );
}
