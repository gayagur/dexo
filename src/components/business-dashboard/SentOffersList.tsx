import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Send } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { OfferStatus } from '@/lib/database.types';
import { SkeletonCard } from './SkeletonCard';

interface SentOffer {
  id: string;
  project_id: string;
  price: number;
  status: OfferStatus;
  created_at: string;
  project_title: string;
  customer_name: string;
  customer_avatar: string | null;
}

const statusPill: Record<OfferStatus, { bg: string; text: string; label: string }> = {
  pending:  { bg: 'bg-amber-50',   text: 'text-amber-700',   label: 'Pending'  },
  accepted: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Accepted' },
  declined: { bg: 'bg-red-50',     text: 'text-red-600',     label: 'Declined' },
};

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function InitialAvatar({ name }: { name: string }) {
  // Deterministic warm color from name
  const charSum = name.split('').reduce((s, c) => s + c.charCodeAt(0), 0);
  const hues = [20, 25, 30, 35, 15, 340, 10];
  const hue = hues[charSum % hues.length];
  return (
    <div
      className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
      style={{ background: `hsl(${hue} 55% 52%)` }}
    >
      {name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
    </div>
  );
}

interface SentOffersListProps {
  businessId: string | undefined;
}

export function SentOffersList({ businessId }: SentOffersListProps) {
  const [offers, setOffers] = useState<SentOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!businessId) return;

    const fetch = async () => {
      setLoading(true);
      setError(null);

      // Fetch offers with project title and customer profile
      const { data, error: err } = await supabase
        .from('offers')
        .select(`
          id, project_id, price, status, created_at,
          projects!inner(title, customer_id, profiles:customer_id(name, avatar_url))
        `)
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (err) {
        console.error('[SentOffersList] fetch error:', err.message);
        // Fallback: fetch offers without join
        const { data: fallbackData, error: fallbackErr } = await supabase
          .from('offers')
          .select('id, project_id, price, status, created_at')
          .eq('business_id', businessId)
          .order('created_at', { ascending: false })
          .limit(5);

        if (fallbackErr) {
          setError("Couldn't load offers — try refreshing.");
          setLoading(false);
          return;
        }

        setOffers(
          (fallbackData || []).map((o: any) => ({
            id: o.id,
            project_id: o.project_id,
            price: o.price,
            status: o.status,
            created_at: o.created_at,
            project_title: 'Project',
            customer_name: 'Customer',
            customer_avatar: null,
          }))
        );
        setLoading(false);
        return;
      }

      const mapped: SentOffer[] = (data || []).map((row: any) => {
        const project = row.projects;
        const profile = project?.profiles;
        return {
          id: row.id,
          project_id: row.project_id,
          price: row.price,
          status: row.status,
          created_at: row.created_at,
          project_title: project?.title || 'Project',
          customer_name: profile?.name || 'Customer',
          customer_avatar: profile?.avatar_url || null,
        };
      });

      setOffers(mapped);
      setLoading(false);
    };

    fetch();
  }, [businessId]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
          Offers I Sent
        </h2>
        {offers.length > 0 && (
          <Link
            to="/business/offers"
            className="text-xs text-[#C96A3D] hover:text-[#C96A3D]/80 transition-colors flex items-center gap-1"
          >
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        )}
      </div>

      <div className="bg-white rounded-[14px] border border-black/[0.07] shadow-sm overflow-hidden">
        {loading ? (
          <div>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={i > 0 ? 'border-t border-gray-50' : ''}>
                <SkeletonCard variant="offer-row" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="px-5 py-8 text-center text-sm text-red-500/80">
            {error}
          </div>
        ) : offers.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <div className="w-11 h-11 rounded-xl bg-[#C96A3D]/[0.06] flex items-center justify-center mx-auto mb-3">
              <Send className="w-5 h-5 text-[#C96A3D]/30" />
            </div>
            <p className="text-sm font-medium text-gray-700 mb-1">No offers sent yet</p>
            <p className="text-xs text-gray-400 max-w-[260px] mx-auto">
              Browse open projects to find work and send your first offer.
            </p>
            <Link to="/business" className="inline-block mt-4">
              <span className="text-xs font-medium text-[#C96A3D] hover:text-[#C96A3D]/80 transition-colors">
                Browse Projects →
              </span>
            </Link>
          </div>
        ) : (
          offers.map((offer, i) => {
            const pill = statusPill[offer.status];
            return (
              <motion.div
                key={offer.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1], delay: 0.15 + i * 0.04 }}
              >
                <Link to={`/business/request/${offer.project_id}`}>
                  <div
                    className={`
                      flex items-center gap-4 px-5 py-3.5 cursor-pointer
                      hover:bg-gray-50/60 transition-colors duration-200
                      ${i > 0 ? 'border-t border-gray-50' : ''}
                    `}
                  >
                    {/* Avatar */}
                    {offer.customer_avatar ? (
                      <img
                        src={offer.customer_avatar}
                        alt={offer.customer_name}
                        className="w-9 h-9 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <InitialAvatar name={offer.customer_name} />
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {offer.customer_name}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        {offer.project_title}
                      </p>
                    </div>

                    {/* Price */}
                    <span
                      className="text-sm font-semibold text-gray-700 shrink-0 hidden sm:block"
                      style={{ fontVariantNumeric: 'tabular-nums' }}
                    >
                      ${offer.price.toLocaleString()}
                    </span>

                    {/* Time */}
                    <span className="text-[11px] text-gray-400 shrink-0 w-14 text-right hidden md:block">
                      {timeAgo(offer.created_at)}
                    </span>

                    {/* Status */}
                    <span
                      className={`text-[11px] font-medium px-2.5 py-1 rounded-full shrink-0 ${pill.bg} ${pill.text}`}
                    >
                      {pill.label}
                    </span>
                  </div>
                </Link>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
