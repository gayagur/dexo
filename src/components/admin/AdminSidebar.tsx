import { Link, useLocation } from "react-router-dom";
import {
  BarChart3,
  Clock,
  Palette,
  Users,
  FolderOpen,
  Star,
  ArrowLeft,
  BookOpen,
} from "lucide-react";

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
}

interface AdminSidebarProps {
  pendingCount?: number;
}

export function AdminSidebar({ pendingCount = 0 }: AdminSidebarProps) {
  const location = useLocation();

  const navItems: NavItem[] = [
    { to: "/admin", label: "Dashboard", icon: BarChart3 },
    { to: "/admin/pending", label: "Pending Approvals", icon: Clock, badge: pendingCount },
    { to: "/admin/creators", label: "Creators", icon: Palette },
    { to: "/admin/clients", label: "Clients", icon: Users },
    { to: "/admin/projects", label: "Projects", icon: FolderOpen },
    { to: "/admin/reviews", label: "Reviews", icon: Star },
    { to: "/admin/blog", label: "Blog", icon: BookOpen },
  ];

  const isActive = (path: string) => {
    if (path === "/admin") return location.pathname === "/admin";
    if (path === "/admin/blog") return location.pathname.startsWith("/admin/blog");
    return location.pathname.startsWith(path);
  };

  return (
    <aside className="w-64 h-screen bg-white border-r border-gray-100 flex flex-col fixed left-0 top-0 z-40">
      {/* Header */}
      <div className="h-16 flex items-center px-5 border-b border-gray-50">
        <Link to="/admin" className="flex items-center gap-2.5">
          <span className="text-xl font-serif font-semibold text-gray-900">DEXO</span>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-[#C05621] bg-[#C05621]/8 px-2 py-0.5 rounded-md">
            Admin
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, label, icon: Icon, badge }) => {
          const active = isActive(to);
          return (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 ${
                active
                  ? "bg-[#C05621] text-white shadow-sm shadow-[#C05621]/20"
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
      </nav>

      {/* Footer */}
      <div className="px-3 pb-4 border-t border-gray-50 pt-3">
        <Link
          to="/home"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-gray-400 hover:bg-gray-50 hover:text-gray-900 transition-all duration-200"
        >
          <ArrowLeft className="w-[18px] h-[18px]" />
          <span>Back to Platform</span>
        </Link>
      </div>
    </aside>
  );
}
