import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { ConfirmModal } from "@/components/admin/ConfirmModal";
import { useAdmin } from "@/hooks/useAdmin";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";
import type { Profile } from "@/lib/database.types";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function ManageClients() {
  const { fetchAllProfiles, updateProfile, loading, setLoading } = useAdmin();

  const [clients, setClients] = useState<Profile[]>([]);

  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editClient, setEditClient] = useState<Profile | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [saving, setSaving] = useState(false);

  // Delete confirm state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteClient, setDeleteClient] = useState<Profile | null>(null);

  const loadClients = async () => {
    setLoading(true);
    const profiles = await fetchAllProfiles();
    setClients(profiles.filter((p) => p.role === "customer"));
    setLoading(false);
  };

  useEffect(() => {
    loadClients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Edit handlers ──────────────────────────────────────
  const openEdit = (client: Profile) => {
    setEditClient(client);
    setEditName(client.name);
    setEditEmail(client.email);
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editClient) return;
    setSaving(true);
    const { error } = await updateProfile(editClient.id, { name: editName, email: editEmail });
    setSaving(false);
    if (error) {
      toast.error("Failed to update client: " + error);
      return;
    }
    toast.success("Client updated successfully");
    setEditOpen(false);
    setEditClient(null);
    await loadClients();
  };

  // ── Delete handlers ────────────────────────────────────
  const openDelete = (client: Profile) => {
    setDeleteClient(client);
    setDeleteOpen(true);
  };

  const handleConfirmDelete = () => {
    toast.error("Profile deletion requires Supabase dashboard access");
    setDeleteOpen(false);
    setDeleteClient(null);
  };

  // ── Table columns ──────────────────────────────────────
  const columns: Column<Profile>[] = [
    {
      key: "name",
      label: "Name",
      sortable: true,
      searchable: true,
    },
    {
      key: "email",
      label: "Email",
      sortable: true,
      searchable: true,
    },
    {
      key: "created_at",
      label: "Registered",
      sortable: true,
      searchable: false,
      render: (row) => formatDate(row.created_at),
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
            className="h-8 w-8 p-0 text-gray-500 hover:text-red-600"
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
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
        <p className="text-sm text-gray-500 mt-1">
          {clients.length} registered client{clients.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Data table */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <DataTable
          columns={columns}
          data={clients}
          loading={loading}
          searchPlaceholder="Search clients by name or email..."
          emptyMessage="No clients found"
        />
      </div>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={(v) => { if (!v) { setEditOpen(false); setEditClient(null); } }}>
        <DialogContent className="sm:max-w-md rounded-xl">
          <DialogHeader>
            <DialogTitle>Edit Client</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Client name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                placeholder="Client email"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditOpen(false); setEditClient(null); }} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm modal */}
      <ConfirmModal
        open={deleteOpen}
        onCancel={() => { setDeleteOpen(false); setDeleteClient(null); }}
        onConfirm={handleConfirmDelete}
        title="Delete Client"
        description="This will permanently remove this client and all their data."
        confirmLabel="Delete"
        variant="destructive"
      />
    </AdminLayout>
  );
}
