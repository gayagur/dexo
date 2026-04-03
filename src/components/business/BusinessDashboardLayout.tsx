import { useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { BusinessSidebar } from "./BusinessSidebar";
import { useBusinessProfile } from "@/hooks/useBusinessProfile";
import { AppLayout } from "@/components/app/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Loader2, Clock as ClockIcon, ShieldAlert, Sparkles,
  Pencil, MapPin, Palette, Image,
} from "lucide-react";

const pageVariants = {
  initial: { opacity: 0, y: 16 },
  animate: {
    opacity: 1, y: 0,
    transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
  },
  exit: {
    opacity: 0, y: -8,
    transition: { duration: 0.2, ease: "easeIn" },
  },
};

interface BusinessDashboardLayoutProps {
  children: React.ReactNode;
  newRequestsCount?: number;
}

export function BusinessDashboardLayout({ children, newRequestsCount = 0 }: BusinessDashboardLayoutProps) {
  const navigate = useNavigate();
  const { business, loading } = useBusinessProfile();

  // No business profile → redirect to onboarding
  useEffect(() => {
    if (!loading && !business) {
      navigate("/business/onboarding", { replace: true });
    }
  }, [loading, business, navigate]);

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!business) return null;

  // ── Gate: pending / rejected / suspended ───────────────
  if (business.status !== "approved") {
    return (
      <AppLayout>
        <main className="container mx-auto px-6 py-16 max-w-2xl">
          <div className="text-center">
            <div className={`w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center ${
              business.status === "pending"
                ? "bg-amber-100 text-amber-600"
                : business.status === "rejected"
                  ? "bg-red-100 text-red-600"
                  : "bg-gray-100 text-gray-600"
            }`}>
              {business.status === "pending" && <ClockIcon className="w-10 h-10" />}
              {business.status === "rejected" && <ShieldAlert className="w-10 h-10" />}
              {business.status === "suspended" && <ShieldAlert className="w-10 h-10" />}
            </div>

            {business.status === "pending" && (
              <>
                <h1 className="text-3xl font-serif mb-3">Your profile is under review</h1>
                <p className="text-muted-foreground text-lg leading-relaxed mb-2">
                  Thanks for joining DEXO! Our team is reviewing your profile and portfolio.
                  You'll receive a notification as soon as you're approved — usually within 24–48 hours.
                </p>
              </>
            )}
            {business.status === "rejected" && (
              <>
                <h1 className="text-3xl font-serif mb-3">Profile changes requested</h1>
                <p className="text-muted-foreground text-lg leading-relaxed mb-2">
                  Our team reviewed your profile and has some feedback. Please update your profile and we'll review it again.
                </p>
                {business.rejection_reason && (
                  <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-left mt-4 mb-2">
                    <p className="text-sm font-medium text-red-800 mb-1">Feedback from our team:</p>
                    <p className="text-sm text-red-700">{business.rejection_reason}</p>
                  </div>
                )}
              </>
            )}
            {business.status === "suspended" && (
              <>
                <h1 className="text-3xl font-serif mb-3">Account suspended</h1>
                <p className="text-muted-foreground text-lg leading-relaxed mb-2">
                  Your account has been suspended. Please contact support for more information.
                </p>
              </>
            )}
          </div>

          {/* Profile summary card */}
          <Card className="mt-8 overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                  {business.portfolio?.[0] ? (
                    <img loading="lazy" src={business.portfolio[0]} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Image className="w-7 h-7 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-serif truncate">{business.name}</h3>
                  {business.location && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5" />
                      {business.location}
                    </p>
                  )}
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium shrink-0 ${
                  business.status === "pending"
                    ? "bg-amber-100 text-amber-700"
                    : business.status === "rejected"
                      ? "bg-red-100 text-red-700"
                      : "bg-gray-100 text-gray-700"
                }`}>
                  {business.status === "pending" ? "Under review" : business.status === "rejected" ? "Changes needed" : "Suspended"}
                </span>
              </div>

              {(business.categories?.length > 0 || business.styles?.length > 0) && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {business.categories?.map((cat) => (
                    <span key={cat} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                      <Palette className="w-3 h-3" />
                      {cat}
                    </span>
                  ))}
                  {business.styles?.map((style) => (
                    <span key={style} className="px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground text-xs">
                      {style}
                    </span>
                  ))}
                </div>
              )}

              {business.portfolio?.length > 1 && (
                <div className="mt-4 grid grid-cols-4 gap-2">
                  {business.portfolio.slice(0, 4).map((img, i) => (
                    <div key={i} className="aspect-square rounded-lg overflow-hidden bg-muted">
                      <img loading="lazy" src={img} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button asChild>
              <Link to="/business/onboarding">
                <Pencil className="w-4 h-4 mr-2" />
                Edit my profile
              </Link>
            </Button>
          </div>

          {business.status === "pending" && (
            <div className="mt-8 bg-secondary/50 rounded-xl px-5 py-4 text-center">
              <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                While you wait, make sure your portfolio looks its best!
              </p>
            </div>
          )}
        </main>
      </AppLayout>
    );
  }

  // ── Approved: show dashboard ──────────────────────────
  const location = useLocation();

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <BusinessSidebar newRequestsCount={newRequestsCount} />
      <main className="pl-0 md:pl-64">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="p-4 md:p-8 max-w-[1360px] mx-auto"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
