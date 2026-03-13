import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { ConfirmModal } from "@/components/admin/ConfirmModal";
import { useAdmin, type AdminBusiness } from "@/hooks/useAdmin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Pencil, Trash2, CheckCircle, Ban } from "lucide-react";

type StatusFilter = "all" | "pending" | "approved" | "rejected" | "suspended";

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  approved: "bg-emerald-100 text-emerald-800 border-emerald-200",
  rejected: "bg-red-100 text-red-800 border-red-200",
  suspended: "bg-gray-100 text-gray-600 border-gray-200",
};

export default function ManageCreators() {
  const {
    fetchAllBusinesses,
    updateBusiness,
    deleteBusiness,
    approveBusiness,
    suspendBusiness,
  } = useAdmin();

  const [businesses, setBusinesses] = useState<AdminBusiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AdminBusiness | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    location: "",
    categories: "",
    styles: "",
    min_price: "",
    max_price: "",
  });
  const [editSaving, setEditSaving] = useState(false);

  // Confirm modal state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    type: "delete" | "approve" | "suspend";
    business: AdminBusiness;
  } | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  // ── Load data ──────────────────────────────────────────
  const loadData = async () => {
    setLoading(true);
    const data = await fetchAllBusinesses();
    setBusinesses(data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // ── Filtered data ──────────────────────────────────────
  const filteredData =
    statusFilter === "all"
      ? businesses
      : businesses.filter((b) => b.status === statusFilter);

  // ── Edit handlers ──────────────────────────────────────
  const openEdit = (business: AdminBusiness) => {
    setEditTarget(business);
    setEditForm({
      name: business.name ?? "",
      description: business.description ?? "",
      location: business.location ?? "",
      categories: (business.categories ?? []).join(", "),
      styles: (business.styles ?? []).join(", "),
      min_price: business.min_price != null ? String(business.min_price) : "",
      max_price: business.max_price != null ? String(business.max_price) : "",
    });
    setEditOpen(true);
  };

  const handleEditSave = async () => {
    if (!editTarget) return;
    setEditSaving(true);
    const { error } = await updateBusiness(editTarget.id, {
      name: editForm.name,
      description: editForm.description,
      location: editForm.location,
      categories: editForm.categories.split(",").map((s) => s.trim()).filter(Boolean),
      styles: editForm.styles.split(",").map((s) => s.trim()).filter(Boolean),
      min_price: editForm.min_price ? Number(editForm.min_price) : null,
      max_price: editForm.max_price ? Number(editForm.max_price) : null,
    });
    setEditSaving(false);
    if (error) {
      toast.error("Failed to update creator");
    } else {
      toast.success("Creator updated successfully");
      setEditOpen(false);
      await loadData();
    }
  };

  // ── Confirm action handlers ────────────────────────────
  const openConfirm = (type: "delete" | "approve" | "suspend", business: AdminBusiness) => {
    setConfirmAction({ type, business });
    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    if (!confirmAction) return;
    setConfirmLoading(true);
    const { type, business } = confirmAction;

    let result: { error: string | null };
    if (type === "delete") {
      result = await deleteBusiness(business.id);
    } else if (type === "approve") {
      result = await approveBusiness(business.id, business.user_id);
    } else {
      result = await suspendBusiness(business.id);
    }

    setConfirmLoading(false);
    setConfirmOpen(false);
    setConfirmAction(null);

    if (result.error) {
      toast.error(`Failed to ${type} creator`);
    } else {
      const messages: Record<string, string> = {
        delete: "Creator deleted successfully",
        approve: "Creator approved successfully",
        suspend: "Creator suspended successfully",
      };
      toast.success(messages[type]);
      await loadData();
    }
  };

  // ── Columns ────────────────────────────────────────────
  const columns: Column<AdminBusiness>[] = [
    {
      key: "profile_name",
      label: "Name",
      sortable: true,
      render: (row) => (
        <span className="font-medium text-gray-900">{row.profile_name || "—"}</span>
      ),
    },
    {
      key: "profile_email",
      label: "Email",
      searchable: true,
      render: (row) => (
        <span className="text-gray-500 text-sm">{row.profile_email || "—"}</span>
      ),
    },
    {
      key: "categories",
      label: "Categories",
      sortable: false,
      render: (row) => {
        const cats = row.categories ?? [];
        const shown = cats.slice(0, 2);
        const extra = cats.length - 2;
        return (
          <div className="flex items-center gap-1 flex-wrap">
            {shown.map((cat) => (
              <Badge key={cat} variant="secondary" className="text-xs font-normal">
                {cat}
              </Badge>
            ))}
            {extra > 0 && (
              <Badge variant="outline" className="text-xs font-normal text-gray-400">
                +{extra} more
              </Badge>
            )}
            {cats.length === 0 && <span className="text-gray-400">—</span>}
          </div>
        );
      },
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (row) => (
        <Badge
          variant="outline"
          className={`capitalize text-xs ${statusColors[row.status] ?? ""}`}
        >
          {row.status}
        </Badge>
      ),
    },
    {
      key: "rating",
      label: "Rating",
      sortable: true,
      render: (row) => (
        <span className="text-sm text-gray-700">
          {row.rating != null ? `${row.rating} ★` : "—"}
        </span>
      ),
    },
    {
      key: "created_at",
      label: "Registered",
      sortable: true,
      render: (row) => (
        <span className="text-sm text-gray-500">
          {row.created_at
            ? new Date(row.created_at).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })
            : "—"}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      sortable: false,
      searchable: false,
      render: (row) => (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700"
            onClick={() => openEdit(row)}
            title="Edit"
          >
            <Pencil className="w-4 h-4" />
          </Button>

          {row.status !== "approved" ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-emerald-500 hover:text-emerald-700"
              onClick={() => openConfirm("approve", row)}
              title="Approve"
            >
              <CheckCircle className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600"
              onClick={() => openConfirm("suspend", row)}
              title="Suspend"
            >
              <Ban className="w-4 h-4" />
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-red-400 hover:text-red-600"
            onClick={() => openConfirm("delete", row)}
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  // ── Confirm modal text ─────────────────────────────────
  const confirmText = {
    delete: {
      title: "Delete Creator",
      description: `Are you sure you want to delete "${confirmAction?.business.profile_name || "this creator"}"? This action cannot be undone.`,
      label: "Delete",
      variant: "destructive" as const,
    },
    approve: {
      title: "Approve Creator",
      description: `Approve "${confirmAction?.business.profile_name || "this creator"}"? They will be able to receive project requests.`,
      label: "Approve",
      variant: "default" as const,
    },
    suspend: {
      title: "Suspend Creator",
      description: `Suspend "${confirmAction?.business.profile_name || "this creator"}"? They will no longer be able to receive new requests.`,
      label: "Suspend",
      variant: "destructive" as const,
    },
  };

  const currentConfirm = confirmAction ? confirmText[confirmAction.type] : null;

  // ── Render ─────────────────────────────────────────────
  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Creators</h1>
          <p className="text-sm text-gray-500 mt-1">
            {businesses.length} total creator{businesses.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Table */}
        <DataTable
          columns={columns}
          data={filteredData}
          loading={loading}
          searchPlaceholder="Search by email..."
          emptyMessage="No creators found"
          filterSlot={
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as StatusFilter)}
            >
              <SelectTrigger className="h-9 w-[160px] text-sm bg-white border-gray-200">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          }
        />
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Creator</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Business Name</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editForm.description}
                onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-location">Location</Label>
              <Input
                id="edit-location"
                value={editForm.location}
                onChange={(e) => setEditForm((f) => ({ ...f, location: e.target.value }))}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-categories">Categories (comma-separated)</Label>
              <Input
                id="edit-categories"
                value={editForm.categories}
                onChange={(e) => setEditForm((f) => ({ ...f, categories: e.target.value }))}
                placeholder="Photography, Design, Video"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-styles">Styles (comma-separated)</Label>
              <Input
                id="edit-styles"
                value={editForm.styles}
                onChange={(e) => setEditForm((f) => ({ ...f, styles: e.target.value }))}
                placeholder="Modern, Minimal, Bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-min-price">Min Price</Label>
                <Input
                  id="edit-min-price"
                  type="number"
                  value={editForm.min_price}
                  onChange={(e) => setEditForm((f) => ({ ...f, min_price: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-max-price">Max Price</Label>
                <Input
                  id="edit-max-price"
                  type="number"
                  value={editForm.max_price}
                  onChange={(e) => setEditForm((f) => ({ ...f, max_price: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={editSaving}>
              Cancel
            </Button>
            <Button onClick={handleEditSave} disabled={editSaving}>
              {editSaving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Modal */}
      {currentConfirm && (
        <ConfirmModal
          open={confirmOpen}
          onConfirm={handleConfirm}
          onCancel={() => {
            setConfirmOpen(false);
            setConfirmAction(null);
          }}
          title={currentConfirm.title}
          description={currentConfirm.description}
          confirmLabel={currentConfirm.label}
          variant={currentConfirm.variant}
          loading={confirmLoading}
        />
      )}
    </AdminLayout>
  );
}
