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
import { Crown, Pencil, ShieldCheck, ShieldOff, Trash2 } from "lucide-react";
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

  // Admin toggle state
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminClient, setAdminClient] = useState<Profile | null>(null);
  const [adminSaving, setAdminSaving] = useState(false);

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

  // ── Admin toggle handlers ─────────────────────────────
  const openAdminToggle = (client: Profile) => {
    setAdminClient(client);
    setAdminOpen(true);
  };

  const handleConfirmAdminToggle = async () => {
    if (!adminClient) return;
    setAdminSaving(true);
    const newValue = !adminClient.is_admin;
    const { error } = await updateProfile(adminClient.id, { is_admin: newValue });
    setAdminSaving(false);
    if (error) {
      toast.error("Failed to update admin status: " + error);
      return;
    }
    toast.success(newValue ? `${adminClient.name || "User"} is now an admin` : `Admin access removed from ${adminClient.name || "User"}`);
    setAdminOpen(false);
    setAdminClient(null);
    await loadClients();
  };

  // ── Table columns ──────────────────────────────────────
  const columns: Column<Profile>[] = [
    {
      key: "name",
      label: "Name",
      sortable: true,
      searchable: true,
      render: (row) => (
        <div className="flex items-center gap-2">
          <span>{row.name}</span>
          {row.is_admin && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
              <Crown className="w-3 h-3" />
              ADMIN
            </span>
          )}
        </div>
      ),
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
            variant={row.is_admin ? "outline" : "ghost"}
            size="sm"
            className={
              row.is_admin
                ? "h-8 gap-1 px-2 text-xs text-gray-500 border-gray-300 hover:text-red-600 hover:border-red-300"
                : "h-8 gap-1 px-2 text-xs text-amber-700 hover:text-amber-800 hover:bg-amber-50"
            }
            onClick={(e) => {
              e.stopPropagation();
              openAdminToggle(row);
            }}
          >
            {row.is_admin ? (
              <><ShieldOff className="w-3.5 h-3.5" /> Remove Admin</>
            ) : (
              <><ShieldCheck className="w-3.5 h-3.5" /> Make Admin</>
            )}
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

      {/* Admin toggle confirm modal */}
      <ConfirmModal
        open={adminOpen}
        onCancel={() => { setAdminOpen(false); setAdminClient(null); }}
        onConfirm={handleConfirmAdminToggle}
        loading={adminSaving}
        title={adminClient?.is_admin ? "Remove Admin Access" : "Grant Admin Access"}
        description={
          adminClient?.is_admin
            ? `Are you sure you want to remove admin access from ${adminClient?.name || "this user"}? They will no longer be able to access the admin panel.`
            : `Are you sure you want to give admin access to ${adminClient?.name || "this user"}? They will have full access to the admin panel.`
        }
        confirmLabel={adminClient?.is_admin ? "Remove Admin" : "Make Admin"}
        variant={adminClient?.is_admin ? "destructive" : "default"}
      />
    </AdminLayout>
  );
}
