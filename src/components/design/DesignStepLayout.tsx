import { ArrowLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Breadcrumb {
  label: string;
  onClick?: () => void;
}

interface DesignStepLayoutProps {
  title: string;
  subtitle?: string;
  breadcrumbs: Breadcrumb[];
  onBack?: () => void;
  children: React.ReactNode;
}

export function DesignStepLayout({
  title,
  subtitle,
  breadcrumbs,
  onBack,
  children,
}: DesignStepLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FDF8F4] via-[#FAF5EF] to-[#F5EDE4] relative">
      {/* Brand accent top border */}
      <div className="h-1 bg-gradient-to-r from-[#C87D5A] via-[#D4956F] to-[#C87D5A]" />

      {/* Subtle dot pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle, #C87D5A 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      <div className="relative max-w-5xl mx-auto px-8 py-10">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-2">
              {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-[#C87D5A]/40" />}
              {crumb.onClick ? (
                <button
                  onClick={crumb.onClick}
                  className="hover:text-[#C87D5A] transition-colors duration-200"
                >
                  {crumb.label}
                </button>
              ) : (
                <span className="text-gray-900 font-medium">{crumb.label}</span>
              )}
            </span>
          ))}
        </div>

        {/* Header */}
        <div className="flex items-start gap-5 mb-10">
          {onBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="mt-1 shrink-0 hover:bg-[#C87D5A]/10 hover:text-[#C87D5A] transition-colors duration-200"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <div>
            <h1 className="text-3xl lg:text-4xl font-serif text-gray-900 tracking-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="text-base text-muted-foreground mt-2 max-w-xl leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Content */}
        {children}
      </div>
    </div>
  );
}
