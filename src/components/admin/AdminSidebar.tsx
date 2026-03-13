import { Link, useLocation } from "react-router-dom";
import {
  BarChart3,
  Clock,
  Palette,
  Users,
  FolderOpen,
  Star,
  ArrowLeft,
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
  ];

  const isActive = (path: string) => {
    if (path === "/admin") return location.pathname === "/admin";
    return location.pathname.startsWith(path);
  };

  return (
    <aside className="w-64 h-screen bg-white border-r border-gray-200 flex flex-col fixed left-0 top-0 z-40">
      {/* Header */}
      <div className="h-16 flex items-center px-5 border-b border-gray-100">
        <Link to="/admin" className="flex items-center gap-2.5">
          <span className="text-xl font-serif font-semibold text-gray-900">DEXO</span>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
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
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-gray-900 text-white"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <Icon className={`w-4.5 h-4.5 ${active ? "text-white" : "text-gray-400"}`} />
              <span className="flex-1">{label}</span>
              {badge != null && badge > 0 && (
                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-full min-w-[22px] text-center ${
                    active
                      ? "bg-white/20 text-white"
                      : "bg-amber-100 text-amber-700"
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
      <div className="px-3 pb-4 border-t border-gray-100 pt-3">
        <Link
          to="/home"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4.5 h-4.5" />
          <span>Back to Platform</span>
        </Link>
      </div>
    </aside>
  );
}
