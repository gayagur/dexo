import { type LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-[#F5E6DC] flex items-center justify-center mb-4">
        <Icon className="w-7 h-7 text-[#C96A3D]" />
      </div>
      <h3 className="font-semibold text-[#1A1208] mb-1">{title}</h3>
      <p className="text-sm text-[#9E9992] max-w-[240px]">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 px-4 py-2 text-sm font-medium text-white bg-[#C96A3D] rounded-full hover:bg-[#A85530] transition-colors shadow-[0_8px_24px_rgba(201,106,61,0.25)]"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
