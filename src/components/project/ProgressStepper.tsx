import { Check } from "lucide-react";
import type { ProjectStatus } from "@/lib/database.types";

const STEPS = [
  { key: "draft", label: "Brief Created" },
  { key: "sent", label: "Sent to Creators" },
  { key: "offers_received", label: "Offers Received" },
  { key: "in_progress", label: "In Progress" },
  { key: "completed", label: "Completed" },
] as const;

const STATUS_ORDER: Record<string, number> = {
  draft: 0,
  sent: 1,
  offers_received: 2,
  in_progress: 3,
  completed: 4,
};

export function ProgressStepper({ status }: { status: ProjectStatus }) {
  const currentIndex = STATUS_ORDER[status] ?? 0;

  return (
    <div className="w-full mb-8">
      <div className="flex items-center">
        {STEPS.map((step, i) => {
          const isDone = i < currentIndex;
          const isCurrent = i === currentIndex;

          return (
            <div key={step.key} className="flex items-center flex-1 last:flex-initial">
              {/* Step circle + label */}
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold
                    transition-all duration-300
                    ${isDone
                      ? "bg-[#C87D5A] text-white"
                      : isCurrent
                        ? "bg-[#C87D5A]/15 text-[#C87D5A] ring-2 ring-[#C87D5A] ring-offset-2"
                        : "bg-muted text-muted-foreground"
                    }
                  `}
                >
                  {isDone ? <Check className="w-4 h-4" /> : i + 1}
                </div>
                <span
                  className={`text-[10px] font-medium text-center leading-tight max-w-[80px]
                    ${isDone || isCurrent ? "text-foreground" : "text-muted-foreground"}
                  `}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector line */}
              {i < STEPS.length - 1 && (
                <div className="flex-1 mx-2 mt-[-18px]">
                  <div
                    className={`h-0.5 rounded-full transition-all duration-300 ${
                      i < currentIndex ? "bg-[#C87D5A]" : "bg-muted"
                    }`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
