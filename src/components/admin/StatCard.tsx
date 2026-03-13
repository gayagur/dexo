import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: { value: number; label: string };
}

export function StatCard({ title, value, subtitle, icon: Icon, trend }: StatCardProps) {
  return (
    <Card className="p-5 bg-white border border-gray-200 hover:border-gray-300 transition-colors">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-semibold text-gray-900 tracking-tight">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-400">{subtitle}</p>
          )}
          {trend && (
            <div className="flex items-center gap-1 mt-1">
              {trend.value >= 0 ? (
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5 text-red-500" />
              )}
              <span
                className={`text-xs font-medium ${
                  trend.value >= 0 ? "text-emerald-600" : "text-red-600"
                }`}
              >
                {trend.value > 0 ? "+" : ""}
                {trend.value}%
              </span>
              <span className="text-xs text-gray-400">{trend.label}</span>
            </div>
          )}
        </div>
        {Icon && (
          <div className="p-2.5 bg-gray-50 rounded-lg">
            <Icon className="w-5 h-5 text-gray-400" />
          </div>
        )}
      </div>
    </Card>
  );
}
