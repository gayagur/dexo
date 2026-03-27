import { ArrowLeft, ChevronRight, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

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
  const navigate = useNavigate();

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

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
        {/* Top nav: Home + Breadcrumbs */}
        <div className="flex items-center gap-3 text-sm text-muted-foreground mb-8">
          {/* Home / DEXO button */}
          <button
            onClick={() => navigate("/dashboard")}
            className="hidden sm:flex items-center gap-1.5 text-gray-500 hover:text-[#C87D5A] transition-colors duration-200 shrink-0"
          >
            <Home className="w-4 h-4" />
            <span className="font-semibold text-xs">DEXO</span>
          </button>
          <ChevronRight className="hidden sm:block w-3.5 h-3.5 text-[#C87D5A]/40 shrink-0" />

          {/* Breadcrumbs */}
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-2">
              {i > 0 && <ChevronRight className={`w-3.5 h-3.5 text-[#C87D5A]/40 ${i < breadcrumbs.length - 1 ? "hidden sm:block" : ""}`} />}
              {crumb.onClick ? (
                <button
                  onClick={crumb.onClick}
                  className={`hover:text-[#C87D5A] transition-colors duration-200 ${i < breadcrumbs.length - 1 ? "hidden sm:inline" : ""}`}
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
        <div className="flex items-start gap-5 mb-6 lg:mb-10">
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
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif text-gray-900 tracking-tight">
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
