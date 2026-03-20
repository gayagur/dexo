import { BusinessSidebar } from "./BusinessSidebar";

interface BusinessDashboardLayoutProps {
  children: React.ReactNode;
  newRequestsCount?: number;
}

export function BusinessDashboardLayout({ children, newRequestsCount = 0 }: BusinessDashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <BusinessSidebar newRequestsCount={newRequestsCount} />
      <main className="pl-64">
        <div className="p-8 max-w-[1360px] mx-auto">{children}</div>
      </main>
    </div>
  );
}
