import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { ConfirmModal } from "@/components/admin/ConfirmModal";
import { useAdmin, type AdminProject } from "@/hooks/useAdmin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "offers_received", label: "Offers Received" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
] as const;

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft: { bg: "bg-gray-100", text: "text-gray-700" },
  sent: { bg: "bg-blue-100", text: "text-blue-700" },
  offers_received: { bg: "bg-amber-100", text: "text-amber-700" },
  in_progress: { bg: "bg-indigo-100", text: "text-indigo-700" },
  completed: { bg: "bg-emerald-100", text: "text-emerald-700" },
};

function StatusBadge({ status }: { status: string }) {
  const colors = STATUS_COLORS[status] ?? STATUS_COLORS.draft;
  const label = STATUS_OPTIONS.find((s) => s.value === status)?.label ?? status;
  return (
    <Badge variant="secondary" className={`${colors.bg} ${colors.text} border-0 font-medium`}>
      {label}
    </Badge>
  );
}

export default function ManageProjects() {
  const { fetchAllProjects, updateProject, deleteProject } = useAdmin();

  const [projects, setProjects] = useState<AdminProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");

  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editProject, setEditProject] = useState<AdminProject | null>(null);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    category: "",
    status: "draft" as string,
    budget_min: 0,
    budget_max: 0,
  });
  const [saving, setSaving] = useState(false);

  // Delete confirm state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminProject | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadProjects = async () => {
    setLoading(true);
    const data = await fetchAllProjects();
    setProjects(data);
    setLoading(false);
  };

  useEffect(() => {
    loadProjects();
  }, []);

  // Filter by status
  const filteredProjects =
    statusFilter === "all"
      ? projects
      : projects.filter((p) => p.status === statusFilter);

  // ── Edit handlers ──────────────────────────────────────
  const openEdit = (project: AdminProject) => {
    setEditProject(project);
    setEditForm({
      title: project.title,
      description: project.description ?? "",
      category: project.category ?? "",
      status: project.status,
      budget_min: project.budget_min ?? 0,
      budget_max: project.budget_max ?? 0,
    });
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!editProject) return;
    setSaving(true);
    const { error } = await updateProject(editProject.id, {
      title: editForm.title,
      description: editForm.description,
      category: editForm.category,
      status: editForm.status as AdminProject["status"],
      budget_min: editForm.budget_min,
      budget_max: editForm.budget_max,
    });
    setSaving(false);

    if (error) {
      toast.error("Failed to update project", { description: error });
      return;
    }

    toast.success("Project updated successfully");
    setEditOpen(false);
    setEditProject(null);
    await loadProjects();
  };

  // ── Delete handlers ────────────────────────────────────
  const openDelete = (project: AdminProject) => {
    setDeleteTarget(project);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await deleteProject(deleteTarget.id);
    setDeleting(false);

    if (error) {
      toast.error("Failed to delete project", { description: error });
      return;
    }

    toast.success("Project deleted successfully");
    setDeleteOpen(false);
    setDeleteTarget(null);
    await loadProjects();
  };

  // ── Table columns ──────────────────────────────────────
  const columns: Column<AdminProject>[] = [
    {
      key: "title",
      label: "Title",
      sortable: true,
      searchable: true,
    },
    {
      key: "customer_name",
      label: "Customer",
      sortable: true,
      searchable: true,
    },
    {
      key: "category",
      label: "Category",
      sortable: true,
      searchable: false,
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      searchable: false,
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "budget_min",
      label: "Budget",
      sortable: true,
      searchable: false,
      render: (row) => (
        <span className="text-sm text-gray-700">
          ${(row.budget_min ?? 0).toLocaleString()} - ${(row.budget_max ?? 0).toLocaleString()}
        </span>
      ),
    },
    {
      key: "created_at",
      label: "Created",
      sortable: true,
      searchable: false,
      render: (row) => (
        <span className="text-sm text-gray-500">
          {new Date(row.created_at).toLocaleDateString()}
        </span>
      ),
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
              openEdit(row);
            }}
          >
            <Pencil className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
            onClick={(e) => {
              e.stopPropagation();
              openDelete(row);
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
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-sm text-gray-500 mt-1">
            {projects.length} total project{projects.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Data Table */}
        <DataTable
          columns={columns}
          data={filteredProjects}
          loading={loading}
          searchPlaceholder="Search projects..."
          emptyMessage="No projects found"
          filterSlot={
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-[180px] text-sm">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        />
      </div>

      {/* ── Edit Dialog ─────────────────────────────────────── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={editForm.title}
                onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editForm.description}
                onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-category">Category</Label>
              <Input
                id="edit-category"
                value={editForm.category}
                onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={editForm.status}
                onValueChange={(v) => setEditForm((f) => ({ ...f, status: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-budget-min">Budget Min</Label>
                <Input
                  id="edit-budget-min"
                  type="number"
                  value={editForm.budget_min}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, budget_min: Number(e.target.value) }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-budget-max">Budget Max</Label>
                <Input
                  id="edit-budget-max"
                  type="number"
                  value={editForm.budget_max}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, budget_max: Number(e.target.value) }))
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm ──────────────────────────────────── */}
      <ConfirmModal
        open={deleteOpen}
        title="Delete Project"
        description="This will permanently delete this project and all associated offers and messages."
        confirmLabel="Delete"
        variant="destructive"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => {
          setDeleteOpen(false);
          setDeleteTarget(null);
        }}
      />
    </AdminLayout>
  );
}
