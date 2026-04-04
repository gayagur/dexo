const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  active: 'bg-amber-100 text-amber-700',
  pending: 'bg-amber-100 text-amber-700',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-emerald-100 text-emerald-700',
  accepted: 'bg-emerald-100 text-emerald-700',
  declined: 'bg-red-100 text-red-600',
  cancelled: 'bg-red-100 text-red-600',
  published: 'bg-emerald-100 text-emerald-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-600',
  suspended: 'bg-gray-100 text-gray-600',
  open: 'bg-blue-100 text-blue-700',
  closed: 'bg-gray-100 text-gray-600',
}

interface StatusBadgeProps {
  status: string;
  label?: string; // override display text
  className?: string;
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const colors = statusColors[status.toLowerCase().replace(/\s+/g, '_')] || 'bg-gray-100 text-gray-600';
  const display = label || status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <span className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full ${colors} ${className || ''}`}>
      {display}
    </span>
  );
}
