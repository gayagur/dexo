import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { toast } from "sonner";
import { format } from "date-fns";
import { Check, X, Library } from "lucide-react";
import {
  fetchPendingSubmissions,
  approveSubmission,
  rejectSubmission,
  type LibrarySubmission,
} from "@/lib/library-api";
import { Card, CardContent } from "@/components/ui/card";

export default function AdminLibraryPage() {
  const [submissions, setSubmissions] = useState<LibrarySubmission[]>([]);
  const [loading, setLoading] = useState(true);
  // Track which row has a reject reason input open
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [acting, setActing] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await fetchPendingSubmissions();
    setLoading(false);
    if (error) {
      toast.error("Could not load submissions", { description: error });
      return;
    }
    setSubmissions(data);
  };

  useEffect(() => {
    load();
  }, []);

  const handleApprove = async (id: string) => {
    setActing(id);
    const { error } = await approveSubmission(id);
    setActing(null);
    if (error) {
      toast.error("Approve failed", { description: error });
      return;
    }
    toast.success("Submission approved and added to community library.");
    setSubmissions((prev) => prev.filter((s) => s.id !== id));
  };

  const handleRejectConfirm = async (id: string) => {
    setActing(id);
    const { error } = await rejectSubmission(id, rejectReason.trim() || undefined);
    setActing(null);
    if (error) {
      toast.error("Reject failed", { description: error });
      return;
    }
    toast.success("Submission rejected.");
    setRejectingId(null);
    setRejectReason("");
    setSubmissions((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Page header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <Library className="w-5 h-5 text-[#C05621]" />
              <h1 className="text-2xl font-serif font-semibold text-gray-900 tracking-tight">
                Community Library
              </h1>
            </div>
            <p className="text-sm text-gray-500 max-w-xl leading-relaxed">
              Review and approve furniture designs submitted by users. Approved submissions appear
              in the community section of the Library Browser.
            </p>
          </div>
          {!loading && (
            <span className="shrink-0 text-sm font-medium text-[#C05621] bg-[#C05621]/8 px-3 py-1.5 rounded-xl">
              {submissions.length} pending
            </span>
          )}
        </div>

        <Card className="border-gray-100 shadow-sm rounded-2xl overflow-hidden">
          <CardContent className="p-0">
            {loading ? (
              <div className="py-20 text-center text-sm text-gray-400">Loading submissions…</div>
            ) : submissions.length === 0 ? (
              <div className="py-20 text-center text-sm text-gray-500">
                No pending submissions. Check back later.
              </div>
            ) : (
              <>
                {/* Table header */}
                <div className="grid grid-cols-[1fr_140px_160px_140px_112px] gap-4 px-5 py-3 border-b border-gray-100 bg-gray-50/70">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Name</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Category</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Submitted</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Dims (W×H×D mm)</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 text-right">Actions</span>
                </div>

                <div className="divide-y divide-gray-100">
                  {submissions.map((sub) => (
                    <div key={sub.id}>
                      <div className="grid grid-cols-[1fr_140px_160px_140px_112px] gap-4 items-center px-5 py-4 hover:bg-gray-50/60 transition-colors">
                        {/* Name + description */}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{sub.name}</p>
                          {sub.description && (
                            <p className="text-xs text-gray-400 mt-0.5 truncate">{sub.description}</p>
                          )}
                          {sub.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {sub.tags.slice(0, 4).map((tag) => (
                                <span
                                  key={tag}
                                  className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-md"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Category */}
                        <span className="text-xs text-gray-600 capitalize">{sub.category}</span>

                        {/* Date */}
                        <span className="text-xs text-gray-500">
                          {format(new Date(sub.created_at), "MMM d, yyyy HH:mm")}
                        </span>

                        {/* Dims */}
                        <span className="text-xs font-mono text-gray-500">
                          {sub.dims.w}×{sub.dims.h}×{sub.dims.d}
                        </span>

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleApprove(sub.id)}
                            disabled={acting === sub.id}
                            title="Approve"
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors disabled:opacity-50"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (rejectingId === sub.id) {
                                setRejectingId(null);
                                setRejectReason("");
                              } else {
                                setRejectingId(sub.id);
                                setRejectReason("");
                              }
                            }}
                            disabled={acting === sub.id}
                            title="Reject"
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors disabled:opacity-50"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Inline reject reason row */}
                      {rejectingId === sub.id && (
                        <div className="px-5 pb-4 flex items-center gap-3 bg-red-50/40">
                          <input
                            type="text"
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Optional rejection reason…"
                            className="flex-1 h-8 px-3 rounded-lg border border-red-200 text-xs text-gray-800 placeholder:text-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-red-300/50 focus:border-red-300 transition-colors"
                          />
                          <button
                            onClick={() => handleRejectConfirm(sub.id)}
                            disabled={acting === sub.id}
                            className="px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-medium transition-colors disabled:opacity-50"
                          >
                            {acting === sub.id ? "Rejecting…" : "Confirm Reject"}
                          </button>
                          <button
                            onClick={() => { setRejectingId(null); setRejectReason(""); }}
                            className="px-3 py-1.5 rounded-lg text-xs text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
