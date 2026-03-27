import { AdminSidebar } from "./AdminSidebar";

interface AdminLayoutProps {
  children: React.ReactNode;
  pendingCount?: number;
}

export function AdminLayout({ children, pendingCount = 0 }: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <AdminSidebar pendingCount={pendingCount} />
      <main className="pl-0 md:pl-64">
        <div className="p-4 md:p-8 max-w-[1360px] mx-auto">{children}</div>
      </main>
    </div>
  );
}
