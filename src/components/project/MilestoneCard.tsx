import { useState } from "react";
import { Check, Clock, Loader2, AlertTriangle, ExternalLink } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Milestone, MilestoneStatus } from "@/lib/database.types";

export type MilestoneAction =
  | "start"
  | "submit"
  | "approve"
  | "dispute"
  | "request_payment"
  | "customer_paid"
  | "business_received"
  | "release";

interface MilestoneCardProps {
  milestone: Milestone;
  userRole?: "customer" | "business";
  onAction?: (action: MilestoneAction, milestoneId: string, payload?: { paymentLink?: string }) => void;
  isLoading?: boolean;
}

const STATUS_CONFIG: Record<MilestoneStatus, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  pending:                 { label: "Pending",              icon: Clock,          color: "text-muted-foreground", bg: "bg-muted/60" },
  in_progress:             { label: "In Progress",          icon: Loader2,        color: "text-blue-600",         bg: "bg-blue-50" },
  submitted:               { label: "Submitted",            icon: Clock,          color: "text-amber-600",        bg: "bg-amber-50" },
  approved:                { label: "Approved",             icon: Check,          color: "text-green-600",        bg: "bg-green-50" },
  payment_requested:       { label: "Payment Requested",    icon: Clock,          color: "text-purple-600",       bg: "bg-purple-50" },
  customer_paid_confirmed: { label: "Customer Paid",        icon: Check,          color: "text-blue-600",         bg: "bg-blue-50" },
  paid:                    { label: "Paid",                 icon: Check,          color: "text-green-600",        bg: "bg-green-50" },
  released:                { label: "Released",             icon: Check,          color: "text-green-700",        bg: "bg-green-100" },
  disputed:                { label: "Disputed",             icon: AlertTriangle,  color: "text-red-600",          bg: "bg-red-50" },
};

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return "link";
  }
}

export function MilestoneCard({ milestone, userRole, onAction, isLoading }: MilestoneCardProps) {
  const [paymentLink, setPaymentLink] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const config = STATUS_CONFIG[milestone.status];
  const Icon = config.icon;
  const isDone = ["approved", "paid", "released"].includes(milestone.status);
  const isValidUrl = /^https?:\/\/.+/.test(paymentLink);

  const handleAction = (action: MilestoneAction, payload?: { paymentLink?: string }) => {
    if (onAction) {
      onAction(action, milestone.id, payload);
    }
  };

  return (
    <div
      className={`rounded-2xl border p-4 transition-all ${
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

      {/* Action area — only shows when role and handler are provided */}
      {userRole && onAction && (
        <div className="mt-3 pt-3 border-t border-border/50">
          {userRole === "business" && (
            <BusinessActions
              milestone={milestone}
              paymentLink={paymentLink}
              setPaymentLink={setPaymentLink}
              isValidUrl={isValidUrl}
              isLoading={isLoading}
              onAction={handleAction}
            />
          )}
          {userRole === "customer" && (
            <CustomerActions
              milestone={milestone}
              showConfirmModal={showConfirmModal}
              setShowConfirmModal={setShowConfirmModal}
              isLoading={isLoading}
              onAction={handleAction}
            />
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Business Actions ─── */
function BusinessActions({
  milestone,
  paymentLink,
  setPaymentLink,
  isValidUrl,
  isLoading,
  onAction,
}: {
  milestone: Milestone;
  paymentLink: string;
  setPaymentLink: (v: string) => void;
  isValidUrl: boolean;
  isLoading?: boolean;
  onAction: (action: MilestoneAction, payload?: { paymentLink?: string }) => void;
}) {
  switch (milestone.status) {
    case "pending":
      return (
        <Button size="sm" onClick={() => onAction("start")} disabled={isLoading}>
          {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
          Start Work
        </Button>
      );
    case "in_progress":
      return (
        <Button size="sm" onClick={() => onAction("submit")} disabled={isLoading}>
          {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
          Submit for Review
        </Button>
      );
    case "submitted":
      return <p className="text-xs text-muted-foreground">Awaiting customer approval...</p>;
    case "approved":
      return (
        <div className="space-y-2">
          <Input
            type="url"
            placeholder="Paste payment link (PayPal, Venmo, Bit...)"
            value={paymentLink}
            onChange={(e) => setPaymentLink(e.target.value)}
            className="text-sm h-9"
          />
          <Button
            size="sm"
            onClick={() => onAction("request_payment", { paymentLink })}
            disabled={!isValidUrl || isLoading}
          >
            {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
            Request Payment
          </Button>
        </div>
      );
    case "payment_requested":
      return (
        <div className="space-y-1">
          {milestone.payment_link && (
            <p className="text-xs text-muted-foreground truncate">
              Link sent: {milestone.payment_link.slice(0, 40)}...
            </p>
          )}
          <p className="text-xs text-muted-foreground">Waiting for customer to confirm payment...</p>
        </div>
      );
    case "customer_paid_confirmed":
      return (
        <Button
          size="sm"
          className="bg-green-600 hover:bg-green-700 text-white"
          onClick={() => onAction("business_received")}
          disabled={isLoading}
        >
          {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
          Confirm Payment Received
        </Button>
      );
    case "paid":
      return (
        <Button size="sm" onClick={() => onAction("release")} disabled={isLoading}>
          {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
          {milestone.milestone_number === 3 ? "Mark Project Complete" : "Release to Next Milestone"}
        </Button>
      );
    case "released":
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700">
          <Check className="w-3 h-3" /> Payment Released
        </span>
      );
    case "disputed":
      return <p className="text-xs text-red-600">Disputed — please contact support</p>;
    default:
      return null;
  }
}

/* ─── Customer Actions ─── */
function CustomerActions({
  milestone,
  showConfirmModal,
  setShowConfirmModal,
  isLoading,
  onAction,
}: {
  milestone: Milestone;
  showConfirmModal: boolean;
  setShowConfirmModal: (v: boolean) => void;
  isLoading?: boolean;
  onAction: (action: MilestoneAction, payload?: { paymentLink?: string }) => void;
}) {
  switch (milestone.status) {
    case "pending":
    case "in_progress":
      return <p className="text-xs text-muted-foreground">Awaiting work submission...</p>;
    case "submitted":
      return (
        <div className="flex gap-2">
          <Button
            size="sm"
            className="bg-green-600 hover:bg-green-700 text-white"
            onClick={() => onAction("approve")}
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
            Approve Work
          </Button>
          <Button size="sm" variant="outline" onClick={() => onAction("dispute")} disabled={isLoading}>
            Raise Dispute
          </Button>
        </div>
      );
    case "approved":
      return <p className="text-xs text-muted-foreground">Waiting for payment request...</p>;
    case "payment_requested":
      return (
        <div className="space-y-2">
          {milestone.payment_link && (
            <a
              href={milestone.payment_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Pay via {getDomain(milestone.payment_link)}
            </a>
          )}
          <Button
            size="sm"
            className="bg-green-600 hover:bg-green-700 text-white"
            onClick={() => setShowConfirmModal(true)}
            disabled={isLoading}
          >
            I've Paid
          </Button>

          {/* Confirmation modal */}
          <AnimatePresence>
            {showConfirmModal && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="mt-2 rounded-xl border border-border bg-card p-3 shadow-lg"
              >
                <p className="text-sm text-foreground mb-3">
                  Confirm that payment was made outside DEXO?
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => {
                      onAction("customer_paid");
                      setShowConfirmModal(false);
                    }}
                    disabled={isLoading}
                  >
                    {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                    Yes, I've paid
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowConfirmModal(false)}>
                    Cancel
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      );
    case "customer_paid_confirmed":
      return <p className="text-xs text-muted-foreground">Payment confirmed — waiting for maker to acknowledge...</p>;
    case "paid":
    case "released":
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700">
          <Check className="w-3 h-3" /> Complete
        </span>
      );
    case "disputed":
      return <p className="text-xs text-red-600">Disputed — please contact support</p>;
    default:
      return null;
  }
}
