import { Link } from "react-router-dom";

interface BlogPublicShellProps {
  children: React.ReactNode;
}

export function BlogPublicShell({ children }: BlogPublicShellProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border/60 bg-background/85 backdrop-blur-md sticky top-0 z-40">
        <div className="container max-w-5xl mx-auto px-5 sm:px-8 h-[4.25rem] flex items-center justify-between">
          <Link
            to="/"
            className="font-serif text-2xl sm:text-[1.65rem] font-semibold text-primary tracking-tight hover:opacity-90 transition-opacity"
          >
            DEXO
          </Link>
          <nav className="flex items-center gap-5 text-sm">
            <Link to="/auth" className="text-muted-foreground hover:text-foreground transition-colors font-medium">
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border/70 mt-auto py-12 bg-secondary/25">
        <div className="container max-w-5xl mx-auto px-5 sm:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-8">
            <div>
              <span className="font-serif text-xl font-semibold text-primary">DEXO</span>
              <p className="text-sm text-muted-foreground mt-2 max-w-xs leading-relaxed">
                AI-powered interior design. Custom furniture and spaces, designed with clarity.
              </p>
            </div>
            <div className="flex flex-wrap gap-x-10 gap-y-3 text-sm text-muted-foreground">
              <div className="space-y-2">
                <div className="text-[11px] font-semibold uppercase tracking-widest text-foreground/50">Resources</div>
                <Link to="/blog" className="block hover:text-foreground transition-colors">
                  Blog
                </Link>
              </div>
              <div className="space-y-2">
                <div className="text-[11px] font-semibold uppercase tracking-widest text-foreground/50">Platform</div>
                <Link to="/auth?role=customer" className="block hover:text-foreground transition-colors">
                  Start a project
                </Link>
                <Link to="/auth?role=business" className="block hover:text-foreground transition-colors">
                  Join as a creator
                </Link>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-10 pt-8 border-t border-border/50">
            © {new Date().getFullYear()} DEXO. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
