import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";

interface BetaCommissionNoticeProps {
  milestoneId: string | null;
  milestoneNumber?: number;
  onAcknowledge: (milestoneId: string) => void;
}

export function BetaCommissionNotice({ milestoneId, milestoneNumber, onAcknowledge }: BetaCommissionNoticeProps) {
  return (
    <AnimatePresence>
      {milestoneId && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", duration: 0.4 }}
            className="w-full max-w-sm mx-4 rounded-2xl bg-card border border-border p-6 shadow-xl text-center"
          >
            <div className="text-4xl mb-3">🎉</div>
            <h3 className="text-lg font-serif font-semibold text-foreground mb-2">
              Milestone {milestoneNumber} Complete!
            </h3>
            <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
              As a DEXO beta partner, this milestone payment is commission-free.
              When we launch fully, our platform fee will be 15% per completed deal.
              Thank you for your early support!
            </p>
            <Button onClick={() => onAcknowledge(milestoneId)}>
              Got it!
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
