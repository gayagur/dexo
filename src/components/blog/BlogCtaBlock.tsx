import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function BlogCtaBlock() {
  return (
    <aside className="mt-16 mb-4 rounded-2xl border border-border/80 bg-gradient-to-br from-secondary/60 via-background to-secondary/40 p-8 sm:p-10 shadow-sm">
      <p className="font-serif text-xl sm:text-2xl text-foreground leading-snug text-balance">
        Turn your idea into furniture that actually fits your space.
      </p>
      <p className="mt-3 text-sm text-muted-foreground max-w-lg leading-relaxed">
        DEXO pairs AI visual design with skilled makers and designers — so you can explore concepts first, then
        commission work with confidence.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button asChild className="rounded-xl shadow-sm">
          <Link to="/auth?role=customer">Start designing</Link>
        </Button>
        <Button asChild variant="outline" className="rounded-xl border-border/80 bg-background/80">
          <Link to="/">Learn about DEXO</Link>
        </Button>
      </div>
    </aside>
  );
}
