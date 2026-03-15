import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  trend?: { value: number; label: string };
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = "text-[#C05621]",
  iconBg = "bg-[#C05621]/8",
  trend,
}: StatCardProps) {
  const isPositive = trend && trend.value >= 0;

  return (
    <div className="group relative bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md hover:border-gray-200/80 transition-all duration-300">
      <div className="flex items-start justify-between">
        <div className="space-y-1 min-w-0 flex-1">
          <p className="text-[13px] font-medium text-gray-400 tracking-wide">
            {title}
          </p>
          <p className="text-[28px] font-semibold text-gray-900 leading-tight tracking-tight tabular-nums">
            {typeof value === "number" ? value.toLocaleString() : value}
          </p>
          {subtitle && (
            <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
          )}
          {trend && (
            <div className="flex items-center gap-1.5 mt-1.5">
              <span
                className={`inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-md ${
                  isPositive
                    ? "text-emerald-700 bg-emerald-50"
                    : "text-red-700 bg-red-50"
                }`}
              >
                {isPositive ? "↑" : "↓"}
                {Math.abs(trend.value)}%
              </span>
              <span className="text-[11px] text-gray-400">{trend.label}</span>
            </div>
          )}
        </div>
        {Icon && (
          <div className={`p-2.5 rounded-xl ${iconBg} shrink-0`}>
            <Icon className={`w-5 h-5 ${iconColor}`} />
          </div>
        )}
      </div>
    </div>
  );
}
