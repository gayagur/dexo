import { Check, Pencil, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import type { BriefData, ProgressItem, ChatPhase } from "./types";

interface ProgressSidebarProps {
  items: ProgressItem[];
  briefData: Partial<BriefData>;
  editingField: string | null;
  phase: ChatPhase;
  onEditField: (field: string, stepIndex: number) => void;
}

export function ProgressSidebar({
  items,
  briefData,
  editingField,
  phase,
  onEditField,
}: ProgressSidebarProps) {
  const filledCount = items.filter((i) => {
    const v = briefData[i.field as keyof BriefData];
    return Array.isArray(v) ? v.length > 0 : !!v;
  }).length;

  return (
    <aside className="hidden lg:flex flex-col w-72 border-r border-[#C05621]/[0.08] bg-white/50 p-6">
      <div className="flex items-center gap-2 mb-8">
        <Sparkles className="w-5 h-5 text-[#C05621]" />
        <h2 className="font-serif text-lg font-bold text-[#1B2432]">
          Brief Progress
        </h2>
      </div>

      <div className="space-y-3 flex-1">
        {items.map((item) => {
          const value = briefData[item.field as keyof BriefData];
          const filled = Array.isArray(value) ? value.length > 0 : !!value;
          const isEditing = editingField === item.field;
          const Icon = item.icon;
          const canEdit =
            filled && (phase === "chatting" || phase === "brief");

          return (
            <div
              key={item.field}
              onClick={() =>
                canEdit && onEditField(item.field, item.stepIndex)
              }
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 group ${
                isEditing
                  ? "bg-[#C05621]/10 border border-[#C05621]/30 ring-2 ring-[#C05621]/20 animate-pulse"
                  : filled
                  ? "bg-[#C05621]/[0.06] border border-[#C05621]/10"
                  : "bg-white/60 border border-transparent"
              } ${canEdit ? "cursor-pointer hover:border-[#C05621]/30" : ""}`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                  isEditing
                    ? "bg-[#C05621]/20 text-[#C05621]"
                    : filled
                    ? "bg-[#C05621]/10 text-[#C05621]"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                {filled ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-[#4A5568]">
                  {item.label}
                </div>
                {filled && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="text-xs text-[#C05621] truncate mt-0.5"
                  >
                    {Array.isArray(value)
                      ? (value as string[]).join(", ")
                      : String(value)}
                  </motion.div>
                )}
              </div>
              {canEdit && !isEditing && (
                <Pencil className="w-3.5 h-3.5 text-[#C05621]/40 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
              )}
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="mt-auto pt-6">
        <div className="flex justify-between text-xs text-[#4A5568] mb-2">
          <span>Progress</span>
          <span>
            {filledCount}/{items.length}
          </span>
        </div>
        <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-[#C05621]"
            initial={{ width: 0 }}
            animate={{
              width: `${(filledCount / items.length) * 100}%`,
            }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
      </div>
    </aside>
  );
}
