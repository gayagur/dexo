import { useState, lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const FurniturePreview = lazy(() => import("@/components/design/FurniturePreview").then(m => ({ default: m.FurniturePreview })));
import { HOME_ROOMS, COMMERCIAL_SPACES } from "@/lib/furnitureData";
import { findFurnitureOptionById } from "@/lib/furnitureDesignResume";
import type { EditorSceneData } from "@/lib/furnitureData";
import type { FurnitureDesignDraftRow } from "@/hooks/useFurnitureDesignDrafts";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight, Box, Loader2, Trash2 } from "lucide-react";
import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] } },
};

/** Home / dashboard: show this many drafts before “View all”. */
export const SAVED_DRAFTS_PREVIEW_LIMIT = 3;

function draftRoomLabel(spaceType: string, roomId: string): string {
  const rooms = spaceType === "commercial" ? COMMERCIAL_SPACES : HOME_ROOMS;
  return rooms.find((r) => r.id === roomId)?.label ?? roomId;
}

export interface SavedDesignsDraftsSectionProps {
  drafts: FurnitureDesignDraftRow[];
  loading: boolean;
  removeDraft: (id: string) => Promise<{ error?: string }>;
  /** Show only first N; if more exist, show “View all” when `viewAllHref` is set */
  previewLimit?: number;
  viewAllHref?: string;
  /** Optional link next to title (e.g. New design) */
  newDesignHref?: string;
  newDesignLabel?: string;
  /** When true, show an empty message instead of hiding (for full list page). */
  showWhenEmpty?: boolean;
  /** Omit title row + description (parent page supplies heading). */
  hideHeader?: boolean;
}

export function SavedDesignsDraftsSection({
  drafts,
  loading,
  removeDraft,
  previewLimit,
  viewAllHref,
  newDesignHref = "/new-project",
  newDesignLabel = "New design",
  showWhenEmpty = false,
  hideHeader = false,
}: SavedDesignsDraftsSectionProps) {
  const { toast } = useToast();
  const [deleteTarget, setDeleteTarget] = useState<FurnitureDesignDraftRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  if (!loading && drafts.length === 0 && !showWhenEmpty) return null;

  if (!loading && drafts.length === 0 && showWhenEmpty) {
    return (
      <div className="rounded-2xl border border-border/60 bg-muted/20 px-6 py-10 text-center">
        <Box className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground mb-4">
          No saved 3D drafts yet. Start a furniture design and save from the editor.
        </p>
        <Button asChild size="sm">
          <Link to="/new-project">New design</Link>
        </Button>
      </div>
    );
  }

  const total = drafts.length;
  const visible =
    previewLimit != null ? drafts.slice(0, previewLimit) : drafts;
  const hasMore = previewLimit != null && total > previewLimit;

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await removeDraft(deleteTarget.id);
    setDeleting(false);
    setDeleteTarget(null);
    if (error) {
      toast({
        title: "Could not delete",
        description: error,
        variant: "destructive",
      });
    } else {
      toast({ title: "Design deleted" });
    }
  };

  const title = previewLimit != null ? "Saved 3D drafts" : "All saved 3D drafts";

  return (
    <>
      <motion.section
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        className={previewLimit != null ? "mb-10" : "mb-6"}
      >
        {!hideHeader && (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <Box className="w-5 h-5 text-primary/70 shrink-0" />
                <h2 className="text-lg font-serif font-normal text-foreground">{title}</h2>
                {previewLimit != null && total > 0 && (
                  <span className="text-xs text-muted-foreground">({total})</span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {hasMore && viewAllHref && (
                  <Button variant="outline" size="sm" asChild className="gap-1">
                    <Link to={viewAllHref}>
                      View all ({total})
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </Button>
                )}
                <Link
                  to={newDesignHref}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  {newDesignLabel}
                </Link>
              </div>
            </div>

            {previewLimit != null && (
              <p className="text-sm text-muted-foreground mb-4 max-w-2xl">
                Continue editing furniture you saved from the 3D editor. You can delete a design anytime.
              </p>
            )}
          </>
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-8">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading designs…
          </div>
        ) : (
          <div
            className={
              previewLimit != null
                ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl"
                : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
            }
          >
            {visible.map((draft) => {
              const furniture = findFurnitureOptionById(draft.furniture_id);
              const cardTitle = furniture?.label ?? draft.furniture_id;
              const room = draftRoomLabel(draft.space_type, draft.room_id);
              const created = new Date(draft.created_at).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              });
              return (
                <Card
                  key={draft.id}
                  className="overflow-hidden border-border/60 rounded-2xl hover:border-primary/25 hover:shadow-md transition-all"
                >
                  {/* Canvas must not sit above controls: preview is pointer-events-none + delete layered on top */}
                  <div className="aspect-[16/10] bg-muted/30 relative isolate overflow-hidden">
                    <Suspense fallback={<div className="absolute inset-0 bg-muted animate-pulse" />}>
                      <FurniturePreview
                        panels={draft.panels as EditorSceneData}
                        disableInteraction
                        className="absolute inset-0 h-full w-full min-h-0"
                      />
                    </Suspense>
                    <button
                      type="button"
                      className="absolute top-2 right-2 z-20 pointer-events-auto h-9 w-9 rounded-full bg-background/95 border border-border shadow-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-colors"
                      title="Delete design"
                      aria-label={`Delete ${cardTitle}`}
                      onClick={() => setDeleteTarget(draft)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <CardContent className="p-3 space-y-2">
                    <div>
                      <p className="text-sm font-medium text-foreground truncate">{cardTitle}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {room} · {draft.style}
                      </p>
                      <p className="text-[10px] text-muted-foreground/80 mt-0.5">{created}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="shrink-0 gap-1 text-muted-foreground hover:text-destructive border-destructive/20 hover:border-destructive/50 hover:bg-destructive/5"
                        onClick={() => setDeleteTarget(draft)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </Button>
                      <Button asChild size="sm" className="flex-1 min-w-0 gap-1.5">
                        <Link to={`/new-project?design_id=${draft.id}`}>
                          Continue editing
                          <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </motion.section>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this design?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes{" "}
              <strong>
                {deleteTarget
                  ? findFurnitureOptionById(deleteTarget.furniture_id)?.label ??
                    deleteTarget.furniture_id
                  : ""}
              </strong>{" "}
              from your saved 3D drafts. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleDeleteConfirm()}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2 inline" />
                  Deleting…
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
