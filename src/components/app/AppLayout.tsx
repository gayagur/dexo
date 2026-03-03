import { AppHeader } from './AppHeader';

interface AppLayoutProps {
  children: React.ReactNode;
}

/**
 * Shared layout wrapper for all authenticated pages.
 * Provides: sticky header with avatar dropdown + consistent page structure.
 */
export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      {children}
    </div>
  );
}
