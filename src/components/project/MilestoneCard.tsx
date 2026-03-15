import { Check, Clock, Loader2, AlertTriangle } from "lucide-react";
import type { Milestone, MilestoneStatus } from "@/lib/database.types";

const STATUS_CONFIG: Record<MilestoneStatus, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  pending:           { label: "Pending",           icon: Clock,          color: "text-muted-foreground", bg: "bg-muted/60" },
  in_progress:       { label: "In Progress",       icon: Loader2,        color: "text-blue-600",         bg: "bg-blue-50" },
  submitted:         { label: "Submitted",         icon: Clock,          color: "text-amber-600",        bg: "bg-amber-50" },
  approved:          { label: "Approved",          icon: Check,          color: "text-green-600",        bg: "bg-green-50" },
  payment_requested: { label: "Payment Requested", icon: Clock,          color: "text-purple-600",       bg: "bg-purple-50" },
  paid:              { label: "Paid",              icon: Check,          color: "text-green-600",        bg: "bg-green-50" },
  released:          { label: "Released",          icon: Check,          color: "text-green-700",        bg: "bg-green-100" },
  disputed:          { label: "Disputed",          icon: AlertTriangle,  color: "text-red-600",          bg: "bg-red-50" },
};

export function MilestoneCard({ milestone }: { milestone: Milestone }) {
  const config = STATUS_CONFIG[milestone.status];
  const Icon = config.icon;
  const isDone = ["approved", "paid", "released"].includes(milestone.status);

  return (
    <div
      className={`rounded-xl border p-4 transition-all ${
        isDone ? "border-green-200 bg-green-50/30" : "border-border bg-card"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-muted-foreground">
              Milestone {milestone.milestone_number}
            </span>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-xs text-muted-foreground">
              {milestone.percentage}%
            </span>
          </div>
          <h4 className="text-sm font-medium text-foreground truncate">
            {milestone.title}
          </h4>
        </div>

        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <span className="text-sm font-semibold text-foreground">
            ${Number(milestone.amount).toLocaleString()}
          </span>
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${config.bg} ${config.color}`}
          >
            <Icon className={`w-3 h-3 ${milestone.status === "in_progress" ? "animate-spin" : ""}`} />
            {config.label}
          </span>
        </div>
      </div>
    </div>
  );
}
