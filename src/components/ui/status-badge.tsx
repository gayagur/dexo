const statusColors: Record<string, string> = {
  draft: 'bg-navy/10 text-navy-muted',
  active: 'bg-terracotta/10 text-terracotta',
  pending: 'bg-terracotta-muted/20 text-terracotta-dark',
  sent: 'bg-terracotta/10 text-terracotta',
  offers_received: 'bg-terracotta/15 text-terracotta-dark',
  in_progress: 'bg-terracotta/10 text-terracotta',
  completed: 'bg-emerald-100 text-emerald-700',
  accepted: 'bg-emerald-100 text-emerald-700',
  declined: 'bg-red-100 text-red-600',
  cancelled: 'bg-red-100 text-red-600',
  published: 'bg-emerald-100 text-emerald-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-600',
  suspended: 'bg-navy/10 text-navy-muted',
  open: 'bg-terracotta/10 text-terracotta',
  closed: 'bg-navy/10 text-navy-muted',
}

interface StatusBadgeProps {
  status: string;
  label?: string;
  className?: string;
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const colors = statusColors[status.toLowerCase().replace(/\s+/g, '_')] || 'bg-navy/10 text-navy-muted';
  const display = label || status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <span className={`inline-flex items-center font-sans text-xs font-medium px-2.5 py-1 rounded-full ${colors} ${className || ''}`}>
      {display}
    </span>
  );
}
