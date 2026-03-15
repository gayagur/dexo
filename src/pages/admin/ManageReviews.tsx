import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { ConfirmModal } from "@/components/admin/ConfirmModal";
import { useAdmin, type AdminReview } from "@/hooks/useAdmin";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Trash2, Eye, Star } from "lucide-react";

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${
            i <= rating
              ? "fill-amber-400 text-amber-400"
              : "fill-gray-200 text-gray-200"
          }`}
        />
      ))}
    </div>
  );
}

export default function ManageReviews() {
  const { fetchAllReviews, deleteReview } = useAdmin();
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [loading, setLoading] = useState(true);

  // View dialog
  const [viewReview, setViewReview] = useState<AdminReview | null>(null);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<AdminReview | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadReviews = async () => {
    setLoading(true);
    const data = await fetchAllReviews();
    setReviews(data);
    setLoading(false);
  };

  useEffect(() => {
    loadReviews();
  }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await deleteReview(deleteTarget.id);
    setDeleting(false);
    if (error) {
      toast.error("Failed to delete review");
    } else {
      toast.success("Review deleted successfully");
      setDeleteTarget(null);
      loadReviews();
    }
  };

  const columns: Column<AdminReview>[] = [
    {
      key: "customer_name",
      label: "Customer",
      sortable: true,
      searchable: true,
    },
    {
      key: "business_name",
      label: "Business",
      sortable: true,
      searchable: true,
    },
    {
      key: "rating",
      label: "Rating",
      sortable: true,
      searchable: false,
      render: (row) => <StarRating rating={row.rating} />,
    },
    {
      key: "tags",
      label: "Tags",
      sortable: false,
      searchable: false,
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {(row.tags ?? []).map((tag: string) => (
            <span key={tag} className="px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-medium">
              {tag}
            </span>
          ))}
          {(!row.tags || row.tags.length === 0) && <span className="text-gray-400">—</span>}
        </div>
      ),
    },
    {
      key: "comment",
      label: "Comment",
      sortable: false,
      searchable: true,
      render: (row) => (
        <span className="text-gray-600">
          {row.comment && row.comment.length > 60
            ? `${row.comment.slice(0, 60)}...`
            : row.comment || "—"}
        </span>
      ),
    },
    {
      key: "created_at",
      label: "Date",
      sortable: true,
      searchable: false,
      render: (row) =>
        row.created_at
          ? new Date(row.created_at).toLocaleDateString()
          : "—",
    },
    {
      key: "actions",
      label: "Actions",
      sortable: false,
      searchable: false,
      render: (row) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700"
            onClick={(e) => {
              e.stopPropagation();
              setViewReview(row);
            }}
          >
            <Eye className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-gray-500 hover:text-red-600"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteTarget(row);
            }}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reviews</h1>
          <p className="text-sm text-gray-500 mt-1">
            {reviews.length} total review{reviews.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Table */}
        <DataTable
          columns={columns}
          data={reviews}
          loading={loading}
          searchPlaceholder="Search reviews..."
          emptyMessage="No reviews found"
        />
      </div>

      {/* View Review Dialog */}
      <Dialog open={!!viewReview} onOpenChange={(open) => !open && setViewReview(null)}>
        <DialogContent className="rounded-xl max-w-md">
          <DialogHeader>
            <DialogTitle>Review Details</DialogTitle>
          </DialogHeader>
          {viewReview && (
            <div className="space-y-4 pt-2">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</p>
                <p className="text-sm text-gray-900 mt-0.5">{viewReview.customer_name || "—"}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Business</p>
                <p className="text-sm text-gray-900 mt-0.5">{viewReview.business_name || "—"}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Rating</p>
                <div className="mt-1">
                  <StarRating rating={viewReview.rating} />
                </div>
              </div>
              {viewReview.tags && viewReview.tags.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Tags</p>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {viewReview.tags.map((tag: string) => (
                      <span key={tag} className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Comment</p>
                <p className="text-sm text-gray-900 mt-0.5 whitespace-pre-wrap">
                  {viewReview.comment || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Date</p>
                <p className="text-sm text-gray-900 mt-0.5">
                  {viewReview.created_at
                    ? new Date(viewReview.created_at).toLocaleDateString()
                    : "—"}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Modal */}
      <ConfirmModal
        open={!!deleteTarget}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        title="Delete Review"
        description="This will permanently remove this review."
        confirmLabel="Delete"
        variant="destructive"
        loading={deleting}
      />
    </AdminLayout>
  );
}
