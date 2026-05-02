import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import type { Milestone } from "@/lib/database.types";

interface BetaBannerProps {
  milestones: Milestone[];
}

export function BetaBanner({ milestones }: BetaBannerProps) {
  const showBanner =
    milestones.some((m) =>
      (["payment_requested", "customer_paid_confirmed"] as string[]).includes(m.status)
    ) && !milestones.every((m) => m.status === "released");

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3 }}
          className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3"
        >
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            <span className="font-semibold">DEXO Beta</span> — Payment for this
            milestone is coordinated directly between you and your maker. All
            activity is recorded. Full integrated payments coming soon.
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
