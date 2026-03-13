import { AdminSidebar } from "./AdminSidebar";

interface AdminLayoutProps {
  children: React.ReactNode;
  pendingCount?: number;
}

export function AdminLayout({ children, pendingCount = 0 }: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <AdminSidebar pendingCount={pendingCount} />
      <main className="pl-64">
        <div className="p-8 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
