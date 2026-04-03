import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowUpRight, Palette, Plus } from 'lucide-react';
import type { Project, ProjectStatus } from '@/lib/database.types';
import { SkeletonCard } from './SkeletonCard';

const statusBadge: Record<ProjectStatus, { bg: string; text: string; label: string }> = {
  draft:           { bg: 'bg-gray-100',    text: 'text-gray-600',    label: 'Draft' },
  sent:            { bg: 'bg-blue-50',     text: 'text-blue-700',    label: 'Sent' },
  offers_received: { bg: 'bg-amber-50',    text: 'text-amber-700',   label: 'Offers' },
  in_progress:     { bg: 'bg-emerald-50',  text: 'text-emerald-700', label: 'Active' },
  completed:       { bg: 'bg-primary/10',  text: 'text-primary',     label: 'Done' },
};

function deterministicGradient(name: string): string {
  const sum = name.split('').reduce((s, c) => s + c.charCodeAt(0), 0);
  const pairs = [
    ['#F5E6D8', '#E8D0BA'],
    ['#E0D5C8', '#D4C4B0'],
    ['#DDE5D4', '#C8D4BA'],
    ['#D8DDE5', '#C0CAD8'],
    ['#E5D8E0', '#D4C0CC'],
    ['#E5E0D0', '#D8D0B8'],
  ];
  const [from, to] = pairs[sum % pairs.length];
  return `linear-gradient(135deg, ${from}, ${to})`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `Created ${months[d.getMonth()]} ${d.getDate()}`;
}

interface RecentProjectsProps {
  projects: Project[];
  loading: boolean;
  error?: string | null;
}

export function RecentProjects({ projects, loading, error }: RecentProjectsProps) {
  const recent = projects.slice(0, 4);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
          My Projects
        </h2>
        <Link
          to="/business"
          className="text-xs text-[#C96A3D] hover:text-[#C96A3D]/80 transition-colors flex items-center gap-1"
        >
          <Plus className="w-3 h-3" /> New
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} variant="project" />
          ))}
        </div>
      ) : error ? (
        <div className="text-sm text-red-500/80 bg-red-50 rounded-xl px-4 py-3">
          Couldn't load projects — try refreshing.
        </div>
      ) : recent.length === 0 ? (
        <div className="bg-white rounded-[14px] border border-dashed border-gray-200 py-12 text-center">
          <div className="w-11 h-11 rounded-xl bg-[#C96A3D]/[0.06] flex items-center justify-center mx-auto mb-3">
            <Palette className="w-5 h-5 text-[#C96A3D]/30" />
          </div>
          <p className="text-sm font-medium text-gray-700 mb-1">No projects yet</p>
          <p className="text-xs text-gray-400">Matched projects will show up here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {recent.map((project, i) => {
            const badge = statusBadge[project.status] || statusBadge.draft;
            return (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1], delay: 0.25 + i * 0.05 }}
              >
                <Link to={`/business/request/${project.id}`}>
                  <div
                    className="
                      bg-white rounded-[14px] border border-black/[0.07] overflow-hidden
                      shadow-sm hover:shadow-md hover:-translate-y-[2px]
                      transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]
                      cursor-pointer group
                    "
                  >
                    {/* Cover */}
                    <div className="aspect-[16/10] overflow-hidden relative">
                      {project.ai_concept ? (
                        <img
                          src={project.ai_concept}
                          alt={project.title}
                          loading="lazy"
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                        />
                      ) : (
                        <div
                          className="w-full h-full flex items-center justify-center"
                          style={{ background: deterministicGradient(project.title) }}
                        >
                          <Palette className="w-8 h-8 text-white/30" />
                        </div>
                      )}
                      {/* Arrow overlay */}
                      <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <ArrowUpRight className="w-3.5 h-3.5 text-gray-700" />
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4">
                      <h3 className="text-sm font-semibold text-gray-800 truncate mb-2 group-hover:text-[#C96A3D] transition-colors">
                        {project.title}
                      </h3>
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${badge.bg} ${badge.text}`}>
                          {badge.label}
                        </span>
                        <span className="text-[11px] text-gray-400">
                          {formatDate(project.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
