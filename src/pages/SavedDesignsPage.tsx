import { Link } from "react-router-dom";
import { AppLayout } from "@/components/app/AppLayout";
import { SavedDesignsDraftsSection } from "@/components/customer/SavedDesignsDraftsSection";
import { useFurnitureDesignDrafts } from "@/hooks/useFurnitureDesignDrafts";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

export default function SavedDesignsPage() {
  const { drafts, loading, removeDraft } = useFurnitureDesignDrafts();

  return (
    <AppLayout>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="container mx-auto px-6 py-8 lg:py-10"
      >
        <Link
          to="/home"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>
        <h1 className="text-2xl sm:text-3xl font-serif text-foreground mb-2">Saved 3D designs</h1>
        <p className="text-sm text-muted-foreground mb-8 max-w-2xl">
          All furniture drafts from the 3D editor. Delete any you no longer need.
        </p>
        <SavedDesignsDraftsSection
          drafts={drafts}
          loading={loading}
          removeDraft={removeDraft}
          showWhenEmpty
          hideHeader
        />
      </motion.div>
    </AppLayout>
  );
}
