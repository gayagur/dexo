import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import type { FollowupResponse } from "@/lib/database.types";

interface DealFollowUpProps {
  offerId: string;
  existingResponse: FollowupResponse | null;
  onRespond: (response: FollowupResponse) => void;
}

export function DealFollowUp({ offerId, existingResponse, onRespond }: DealFollowUpProps) {
  const [responded, setResponded] = useState(!!existingResponse);

  if (existingResponse || responded) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="rounded-2xl border border-border bg-card p-5 text-center"
      >
        <p className="text-sm text-muted-foreground">Thanks for the feedback! 🙏</p>
      </motion.div>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5"
      >
        <h3 className="text-base font-serif font-semibold text-foreground mb-1">
          How did your DEXO project go?
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Your feedback helps us improve the platform
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => { onRespond("yes"); setResponded(true); }}
          >
            ✅ Project completed successfully
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => { onRespond("still_talking"); setResponded(true); }}
          >
            💬 We're still working on it
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => { onRespond("no"); setResponded(true); }}
          >
            ❌ It didn't work out
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
