import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Package, Clock, DollarSign, Star, ArrowRightLeft, Plus, Loader2 } from "lucide-react";
import type { DesignOrder, CreatorProfile } from "@/lib/database.types";

export default function CreatorDashboard() {
  const { user, switchRole } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<DesignOrder[]>([]);
  const [profile, setProfile] = useState<CreatorProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function load() {
      const [ordersRes, profileRes] = await Promise.all([
        supabase
          .from("design_orders")
          .select("*")
          .eq("creator_id", user!.id)
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("creator_profiles")
          .select("*")
          .eq("user_id", user!.id)
          .single(),
      ]);

      if (ordersRes.data) setOrders(ordersRes.data as DesignOrder[]);
      if (profileRes.data) setProfile(profileRes.data as CreatorProfile);
      setLoading(false);
    }

    load();
  }, [user]);

  const handleSwitchToClient = async () => {
    await switchRole("customer");
    navigate("/dashboard");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-[#C87D5A]" />
      </div>
    );
  }

  const pendingOrders = orders.filter(o => o.status === "quote_requested");
  const activeOrders = orders.filter(o => ["quoted", "accepted", "in_production"].includes(o.status));
  const completedOrders = orders.filter(o => o.status === "completed");

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-gray-900">DEXO</h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">Creator</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSwitchToClient}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              Switch to Client
            </button>
            <button
              onClick={() => navigate("/profile")}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600"
            >
              {user?.email?.charAt(0).toUpperCase()}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Stats cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Package className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-gray-500">Pending Quotes</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{pendingOrders.length}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-amber-500" />
              <span className="text-xs text-gray-500">Active Orders</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{activeOrders.length}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-green-500" />
              <span className="text-xs text-gray-500">Completed</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{completedOrders.length}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-4 h-4 text-yellow-500" />
              <span className="text-xs text-gray-500">Rating</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{profile?.rating?.toFixed(1) ?? "—"}</p>
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Incoming orders */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200">
            <div className="p-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900 text-sm">Incoming Orders</h2>
            </div>
            <div className="p-4">
              {pendingOrders.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No pending quote requests</p>
                  <p className="text-xs text-gray-400 mt-1">New orders from clients will appear here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingOrders.map(order => (
                    <div key={order.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                      <div>
                        <p className="text-sm font-medium text-gray-900">Order #{order.id.slice(0, 8)}</p>
                        <p className="text-xs text-gray-500">{order.client_message || "No message"}</p>
                      </div>
                      <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                        Quote Requested
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Portfolio */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="p-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900 text-sm">My Portfolio</h2>
            </div>
            <div className="p-4">
              {!profile ? (
                <div className="text-center py-6">
                  <Plus className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 mb-3">Set up your creator profile</p>
                  <button
                    onClick={() => navigate("/creator/profile")}
                    className="text-xs px-4 py-2 rounded-lg bg-[#C87D5A] text-white hover:bg-[#B06B4A] transition-colors"
                  >
                    Create Profile
                  </button>
                </div>
              ) : (
                <div>
                  <p className="font-medium text-gray-900 text-sm">{profile.business_name}</p>
                  <p className="text-xs text-gray-500 mt-1">{profile.location || "No location set"}</p>
                  {profile.specialties.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {profile.specialties.map(s => (
                        <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{s}</span>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={() => navigate("/creator/profile")}
                    className="mt-4 text-xs text-[#C87D5A] hover:underline"
                  >
                    Edit Profile
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
