import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Home, Hammer, Loader2 } from "lucide-react";
import { useState } from "react";

export default function ChooseRolePage() {
  const { user, isCreator, creatorApproved, loading } = useAuth();
  const navigate = useNavigate();
  const [switching, setSwitching] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-[#C87D5A]" />
      </div>
    );
  }

  if (!user) {
    navigate("/auth");
    return null;
  }

  // If not a creator, skip role picker — straight to client dashboard
  if (!isCreator || !creatorApproved) {
    navigate("/dashboard");
    return null;
  }

  const handleChoose = async (role: "customer" | "creator") => {
    setSwitching(true);

    // Update active_role in DB first, THEN navigate
    await supabase
      .from("profiles")
      .update({ active_role: role })
      .eq("id", user.id);

    // Use window.location for a full reload so auth state picks up the new role
    if (role === "creator") {
      window.location.href = "/creator/dashboard";
    } else {
      window.location.href = "/dashboard";
    }
  };

  if (switching) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-[#C87D5A]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome back!</h1>
          <p className="text-gray-500 text-sm">How would you like to use DEXO today?</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Client mode */}
          <button
            onClick={() => handleChoose("customer")}
            className="bg-white rounded-2xl p-6 border-2 border-gray-200 hover:border-[#C87D5A] hover:shadow-lg transition-all text-left group"
          >
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-4 group-hover:bg-blue-100 transition-colors">
              <Home className="w-6 h-6 text-blue-600" />
            </div>
            <h2 className="font-semibold text-gray-900 mb-1">Client</h2>
            <p className="text-xs text-gray-500 leading-relaxed">
              Design furniture, browse creators, manage orders
            </p>
          </button>

          {/* Creator mode */}
          <button
            onClick={() => handleChoose("creator")}
            className="bg-white rounded-2xl p-6 border-2 border-gray-200 hover:border-[#C87D5A] hover:shadow-lg transition-all text-left group"
          >
            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center mb-4 group-hover:bg-amber-100 transition-colors">
              <Hammer className="w-6 h-6 text-amber-600" />
            </div>
            <h2 className="font-semibold text-gray-900 mb-1">Creator</h2>
            <p className="text-xs text-gray-500 leading-relaxed">
              Receive orders, manage portfolio, track production
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}
