import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { ConfirmModal } from "@/components/admin/ConfirmModal";
import { useAdmin, type AdminBusiness } from "@/hooks/useAdmin";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Check, X, Pencil, MapPin, Calendar, Mail, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "@/lib/format-time";

export default function PendingCreators() {
  const {
    fetchPendingBusinesses,
    approveBusiness,
    rejectBusiness,
    updateBusiness,
  } = useAdmin();

  const [businesses, setBusinesses] = useState<AdminBusiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Approve confirm modal
  const [approveTarget, setApproveTarget] = useState<AdminBusiness | null>(null);

  // Reject dialog
  const [rejectTarget, setRejectTarget] = useState<AdminBusiness | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // Edit dialog
  const [editTarget, setEditTarget] = useState<AdminBusiness | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    location: "",
    categories: "",
    min_price: "",
    max_price: "",
  });

  const loadBusinesses = async () => {
    setLoading(true);
    const data = await fetchPendingBusinesses();
    setBusinesses(data);
    setLoading(false);
  };

  useEffect(() => {
    loadBusinesses();
  }, []);

  // ── Approve ────────────────────────────────────────────
  const handleApprove = async () => {
    if (!approveTarget) return;
    setActionLoading(true);
    const { error } = await approveBusiness(approveTarget.id, approveTarget.user_id);
    setActionLoading(false);
    setApproveTarget(null);
    if (error) {
      toast.error("Failed to approve creator");
    } else {
      toast.success("Creator approved");
      loadBusinesses();
    }
  };

  // ── Reject ─────────────────────────────────────────────
  const handleReject = async () => {
    if (!rejectTarget || !rejectReason.trim()) return;
    setActionLoading(true);
    const { error } = await rejectBusiness(rejectTarget.id, rejectTarget.user_id, rejectReason.trim());
    setActionLoading(false);
    setRejectTarget(null);
    setRejectReason("");
    if (error) {
      toast.error("Failed to reject creator");
    } else {
      toast.success("Creator rejected");
      loadBusinesses();
    }
  };

  // ── Edit ───────────────────────────────────────────────
  const openEditDialog = (business: AdminBusiness) => {
    setEditTarget(business);
    setEditForm({
      name: business.name,
      description: business.description,
      location: business.location,
      categories: business.categories.join(", "),
      min_price: business.min_price?.toString() ?? "",
      max_price: business.max_price?.toString() ?? "",
    });
  };

  const handleEditSave = async () => {
    if (!editTarget) return;
    setActionLoading(true);
    const { error } = await updateBusiness(editTarget.id, {
      name: editForm.name,
      description: editForm.description,
      location: editForm.location,
      categories: editForm.categories.split(",").map((c) => c.trim()).filter(Boolean),
      min_price: editForm.min_price ? Number(editForm.min_price) : null,
      max_price: editForm.max_price ? Number(editForm.max_price) : null,
    });
    setActionLoading(false);
    setEditTarget(null);
    if (error) {
      toast.error("Failed to update creator");
    } else {
      toast.success("Creator updated");
      loadBusinesses();
    }
  };

  // ── Skeleton cards ─────────────────────────────────────
  const SkeletonCard = () => (
    <Card className="p-6 border border-gray-200 bg-white">
      <div className="animate-pulse space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-5 w-40 bg-gray-200 rounded" />
          <div className="h-4 w-32 bg-gray-100 rounded" />
        </div>
        <div className="h-4 w-24 bg-gray-100 rounded" />
        <div className="flex gap-2">
          <div className="h-6 w-16 bg-gray-100 rounded-full" />
          <div className="h-6 w-20 bg-gray-100 rounded-full" />
        </div>
        <div className="flex gap-2">
          <div className="h-20 w-20 bg-gray-100 rounded" />
          <div className="h-20 w-20 bg-gray-100 rounded" />
        </div>
        <div className="flex gap-2 pt-2">
          <div className="h-9 w-24 bg-gray-100 rounded" />
          <div className="h-9 w-24 bg-gray-100 rounded" />
          <div className="h-9 w-20 bg-gray-100 rounded" />
        </div>
      </div>
    </Card>
  );

  return (
    <AdminLayout pendingCount={businesses.length}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Pending Approvals</h1>
        {!loading && (
          <Badge variant="secondary" className="text-sm">
            {businesses.length}
          </Badge>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="space-y-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {/* Empty state */}
      {!loading && businesses.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-gray-500">
          <p className="text-lg">No pending creators. All caught up!</p>
        </div>
      )}

      {/* List */}
      {!loading && businesses.length > 0 && (
        <div className="space-y-4">
          {businesses.map((business) => (
            <Card
              key={business.id}
              className="p-6 border border-gray-200 bg-white"
            >
              {/* Creator info */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-bold text-gray-900 text-lg">
                    {business.profile_name || business.name}
                  </span>
                  <span className="flex items-center gap-1 text-sm text-gray-500">
                    <Mail className="h-3.5 w-3.5" />
                    {business.profile_email}
                  </span>
                  {business.location && (
                    <span className="flex items-center gap-1 text-sm text-gray-500">
                      <MapPin className="h-3.5 w-3.5" />
                      {business.location}
                    </span>
                  )}
                </div>

                {/* Categories */}
                {business.categories.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {business.categories.map((cat) => (
                      <Badge key={cat} variant="outline" className="text-xs">
                        {cat}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Date registered */}
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <Calendar className="h-3.5 w-3.5" />
                  Registered {formatDistanceToNow(business.created_at)}
                </div>

                {/* Portfolio preview */}
                <div>
                  {business.portfolio.length > 0 ? (
                    <div className="flex gap-2 flex-wrap">
                      {business.portfolio.slice(0, 4).map((img, idx) => (
                        <img
                          key={idx}
                          src={img}
                          alt={`Portfolio ${idx + 1}`}
                          className="h-20 w-20 rounded object-cover border border-gray-200"
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">No portfolio images</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => setApproveTarget(business)}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setRejectTarget(business)}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEditDialog(business)}
                  >
                    <Pencil className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Approve confirm modal */}
      <ConfirmModal
        open={!!approveTarget}
        onConfirm={handleApprove}
        onCancel={() => setApproveTarget(null)}
        title="Approve Creator"
        description={`Are you sure you want to approve "${approveTarget?.profile_name || approveTarget?.name}"? They will be able to receive project requests.`}
        confirmLabel="Approve"
        loading={actionLoading}
      />

      {/* Reject dialog */}
      <Dialog open={!!rejectTarget} onOpenChange={(v) => !v && setRejectTarget(null)}>
        <DialogContent className="rounded-xl">
          <DialogHeader>
            <DialogTitle>Reject Creator</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-gray-500">
              Provide a reason for rejecting{" "}
              <span className="font-medium text-gray-700">
                {rejectTarget?.profile_name || rejectTarget?.name}
              </span>
              . This will be sent to the creator.
            </p>
            <Textarea
              placeholder="Reason for rejection..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectTarget(null);
                setRejectReason("");
              }}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectReason.trim() || actionLoading}
            >
              {actionLoading && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editTarget} onOpenChange={(v) => !v && setEditTarget(null)}>
        <DialogContent className="rounded-xl max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Creator</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-location">Location</Label>
              <Input
                id="edit-location"
                value={editForm.location}
                onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-categories">Categories (comma-separated)</Label>
              <Input
                id="edit-categories"
                value={editForm.categories}
                onChange={(e) => setEditForm({ ...editForm, categories: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-min-price">Min Price</Label>
                <Input
                  id="edit-min-price"
                  type="number"
                  value={editForm.min_price}
                  onChange={(e) => setEditForm({ ...editForm, min_price: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-max-price">Max Price</Label>
                <Input
                  id="edit-max-price"
                  type="number"
                  value={editForm.max_price}
                  onChange={(e) => setEditForm({ ...editForm, max_price: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditTarget(null)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button onClick={handleEditSave} disabled={actionLoading}>
              {actionLoading && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
