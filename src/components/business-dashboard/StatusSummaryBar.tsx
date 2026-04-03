import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { Project, ProjectStatus } from '@/lib/database.types';
import { SkeletonCard } from './SkeletonCard';

const statusMeta: Record<ProjectStatus, { label: string; border: string; dot: string }> = {
  draft:           { label: 'Draft',           border: 'border-l-gray-400',   dot: 'bg-gray-400'   },
  sent:            { label: 'Sent',            border: 'border-l-blue-400',   dot: 'bg-blue-400'   },
  offers_received: { label: 'Offers Received', border: 'border-l-amber-400',  dot: 'bg-amber-400'  },
  in_progress:     { label: 'In Progress',     border: 'border-l-emerald-400', dot: 'bg-emerald-400'},
  completed:       { label: 'Completed',       border: 'border-l-primary',    dot: 'bg-primary'    },
};

const orderedStatuses: ProjectStatus[] = ['sent', 'offers_received', 'in_progress', 'completed', 'draft'];

interface StatusSummaryBarProps {
  projects: Project[];
  loading: boolean;
  error?: string | null;
}

export function StatusSummaryBar({ projects, loading, error }: StatusSummaryBarProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonCard key={i} variant="status" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-red-500/80 bg-red-50 rounded-xl px-4 py-3">
        Couldn't load project stats — try refreshing.
      </div>
    );
  }

  // Group by status
  const counts: Record<string, number> = {};
  for (const p of projects) {
    counts[p.status] = (counts[p.status] || 0) + 1;
  }

  // Show all statuses that have counts, in order
  const visible = orderedStatuses.filter(s => (counts[s] || 0) > 0);
  // Always show at least a few even if empty
  const toRender = visible.length > 0 ? visible : orderedStatuses.slice(0, 3);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {toRender.map((status, i) => {
        const meta = statusMeta[status];
        const count = counts[status] || 0;
        return (
          <motion.div
            key={status}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1], delay: 0.05 + i * 0.04 }}
          >
            <Link to={`/business/projects?status=${status}`}>
              <div
                className={`
                  bg-white rounded-[14px] border border-black/[0.07] border-l-[3px] ${meta.border}
                  p-5 cursor-pointer group
                  hover:-translate-y-[2px] hover:shadow-md
                  transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]
                `}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                  <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">
                    {meta.label}
                  </span>
                </div>
                <span
                  className="text-3xl font-bold tracking-tight text-[#C96A3D]"
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {count}
                </span>
              </div>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}
