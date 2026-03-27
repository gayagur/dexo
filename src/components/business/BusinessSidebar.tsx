import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  DollarSign,
  TrendingUp,
  MessageSquare,
  UserCircle,
  ArrowLeft,
  Menu,
} from "lucide-react";
import { useBusinessProfile } from "@/hooks/useBusinessProfile";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
}

interface BusinessSidebarProps {
  newRequestsCount?: number;
}

export function BusinessSidebar({ newRequestsCount = 0 }: BusinessSidebarProps) {
  const location = useLocation();
  const { business } = useBusinessProfile();
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const avatarUrl = user?.user_metadata?.avatar_url || "";
  const businessName = business?.name || "My Business";
  const initials = businessName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const mainNav: NavItem[] = [
    { to: "/business", label: "Overview", icon: LayoutDashboard },
    { to: "/business/projects", label: "Projects", icon: FolderKanban, badge: newRequestsCount },
    { to: "/business/customers", label: "Customers", icon: Users },
    { to: "/business/revenue", label: "Revenue", icon: DollarSign },
    { to: "/business/insights", label: "Insights", icon: TrendingUp },
  ];

  const secondaryNav: NavItem[] = [
    { to: "/business/conversations", label: "Messages", icon: MessageSquare },
    { to: "/business/onboarding", label: "Edit Profile", icon: UserCircle },
  ];

  const isActive = (path: string) => {
    if (path === "/business") return location.pathname === "/business";
    return location.pathname.startsWith(path);
  };

  const NavContent = ({ onLinkClick }: { onLinkClick?: () => void }) => (
    <>
      {/* Business Identity */}
      <div className="h-[72px] flex items-center gap-3 px-5 border-b border-gray-50">
        <Avatar className="h-9 w-9 ring-2 ring-[#C87D5A]/10">
          <AvatarImage src={business?.portfolio?.[0] || avatarUrl} alt={businessName} />
          <AvatarFallback className="bg-[#C87D5A]/10 text-[#C87D5A] text-xs font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900 truncate">{businessName}</p>
          <p className="text-[10px] font-medium text-[#C87D5A] uppercase tracking-widest">Creator Studio</p>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="px-3 text-[10px] font-semibold text-gray-300 uppercase tracking-widest mb-2">
          Dashboard
        </p>
        {mainNav.map(({ to, label, icon: Icon, badge }) => {
          const active = isActive(to);
          return (
            <Link
              key={to}
              to={to}
              onClick={onLinkClick}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 ${
                active
                  ? "bg-[#C87D5A] text-white shadow-sm shadow-[#C87D5A]/20"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <Icon className={`w-[18px] h-[18px] ${active ? "text-white" : "text-gray-400"}`} />
              <span className="flex-1">{label}</span>
              {badge != null && badge > 0 && (
                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-full min-w-[22px] text-center ${
                    active
                      ? "bg-white/20 text-white"
                      : "bg-amber-50 text-amber-600"
                  }`}
                >
                  {badge}
                </span>
              )}
            </Link>
          );
        })}

        <div className="h-px bg-gray-100 my-4" />

        <p className="px-3 text-[10px] font-semibold text-gray-300 uppercase tracking-widest mb-2">
          Tools
        </p>
        {secondaryNav.map(({ to, label, icon: Icon }) => {
          const active = isActive(to);
          return (
            <Link
              key={to}
              to={to}
              onClick={onLinkClick}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 ${
                active
                  ? "bg-[#C87D5A] text-white shadow-sm shadow-[#C87D5A]/20"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <Icon className={`w-[18px] h-[18px] ${active ? "text-white" : "text-gray-400"}`} />
              <span className="flex-1">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-4 border-t border-gray-50 pt-3">
        <Link
          to="/home"
          onClick={onLinkClick}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-gray-400 hover:bg-gray-50 hover:text-gray-900 transition-all duration-200"
        >
          <ArrowLeft className="w-[18px] h-[18px]" />
          <span>Back to Platform</span>
        </Link>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 h-screen bg-white border-r border-gray-100 flex-col fixed left-0 top-0 z-40">
        <NavContent />
      </aside>

      {/* Mobile hamburger + sheet */}
      <div className="md:hidden fixed top-0 left-0 z-50 p-2 safe-area-top">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <button
              className="p-2 rounded-xl bg-white border border-gray-100 shadow-sm text-gray-600 hover:text-gray-900"
              aria-label="Open navigation"
            >
              <Menu className="w-5 h-5" />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64 flex flex-col">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <NavContent onLinkClick={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
