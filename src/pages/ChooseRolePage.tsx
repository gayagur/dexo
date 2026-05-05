import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { pixelCompleteRegistration } from "@/lib/pixel";
import { Home, Hammer, Loader2 } from "lucide-react";
import { useState } from "react";

export default function ChooseRolePage() {
  const { user, activeRole, loading, needsRoleSelection } = useAuth();
  const [switching, setSwitching] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-[#C87D5A]" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!needsRoleSelection) {
    return <Navigate to={activeRole === "business" ? "/business" : "/dashboard"} replace />;
  }

  const handleChoose = async (role: "customer" | "business") => {
    setSwitching(true);
    pixelCompleteRegistration(role);
    localStorage.removeItem(`dexo_needs_role_selection:${user.id}`);

    await supabase
      .from("profiles")
      .update({
        role,
        active_role: role,
        is_business: role === "business",
        is_creator: role === "business",
      })
      .eq("id", user.id);

    if (role === "business") {
      window.location.href = "/business/onboarding";
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
          <h1 className="text-2xl font-bold text-gray-900 mb-2">How do you want to use DEXO?</h1>
          <p className="text-gray-500 text-sm">Choose your starting mode for this new account.</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => handleChoose("customer")}
            className="bg-white rounded-2xl p-6 border-2 border-gray-200 hover:border-[#C87D5A] hover:shadow-lg transition-all text-left group"
          >
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-4 group-hover:bg-blue-100 transition-colors">
              <Home className="w-6 h-6 text-blue-600" />
            </div>
            <h2 className="font-semibold text-gray-900 mb-1">I&apos;m looking for a designer</h2>
            <p className="text-xs text-gray-500 leading-relaxed">
              Start as a customer and manage your own projects.
            </p>
          </button>

          <button
            onClick={() => handleChoose("business")}
            className="bg-white rounded-2xl p-6 border-2 border-gray-200 hover:border-[#C87D5A] hover:shadow-lg transition-all text-left group"
          >
            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center mb-4 group-hover:bg-amber-100 transition-colors">
              <Hammer className="w-6 h-6 text-amber-600" />
            </div>
            <h2 className="font-semibold text-gray-900 mb-1">I&apos;m a designer / creator</h2>
            <p className="text-xs text-gray-500 leading-relaxed">
              Set up your business profile and receive project requests.
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}
