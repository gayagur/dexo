import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.15 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 50 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.25, 0.1, 0.25, 1.0] },
  },
};

const bulletVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: 0.3 + i * 0.08, duration: 0.4, ease: 'easeOut' },
  }),
};

interface CardData {
  badge: string;
  title: string;
  description: string;
  bullets: string[];
  cta: string;
  link: string;
  variant: 'hero' | 'warm';
}

export const cards: CardData[] = [
  {
    badge: 'For Customers',
    title: 'Stop searching endlessly.',
    description:
      'Describe your dream space, see AI-generated design concepts, and let matched designers come to you with offers. Compare pricing, timelines, and portfolios in one place.',
    bullets: [
      'AI generates visual concepts for your space',
      'Get multiple offers from skilled designers',
      'Clear pricing and timeline upfront',
      'Direct chat with designers — no middlemen',
    ],
    cta: 'Start a Project',
    link: '/auth?role=customer',
    variant: 'hero',
  },
  {
    badge: 'For Creators',
    title: 'Stop promoting endlessly.',
    description:
      'No more chasing leads or managing ads. Interior design projects come to you with detailed room briefs, realistic budgets, and clients who are ready to transform their space.',
    bullets: [
      'Matched projects delivered to your dashboard',
      'AI-generated briefs with room details and style preferences',
      'Budget and timeline shown upfront',
      'Focus on your craft, not marketing',
    ],
    cta: 'Join as a Creator',
    link: '/auth?role=business',
    variant: 'warm',
  },
];

export function ValueCard({ card }: { card: CardData }) {
  return (
    <motion.div
      variants={cardVariants}
      whileHover={{ y: -6 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className="group relative"
    >
      {/* Card */}
      <div
        className="relative h-full rounded-3xl border border-[#C05621]/[0.06] bg-white/80 backdrop-blur-sm p-10 lg:p-12
                    shadow-[0_2px_20px_rgba(192,86,33,0.04)]
                    group-hover:shadow-[0_12px_40px_rgba(192,86,33,0.1)]
                    transition-shadow duration-500 overflow-hidden"
      >
        {/* Subtle inner sheen — moves on hover */}
        <div
          className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] pointer-events-none
                      bg-[radial-gradient(ellipse_at_30%_20%,rgba(192,86,33,0.03)_0%,transparent_50%)]
                      group-hover:translate-x-4 group-hover:translate-y-2 transition-transform duration-700 ease-out"
        />

        <div className="relative z-10 space-y-6">
          {/* Badge */}
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#C05621]/[0.07] text-[#C05621] text-xs font-semibold uppercase tracking-wider">
            {card.badge}
          </span>

          {/* Title */}
          <h3 className="text-3xl lg:text-[2rem] font-serif font-bold text-[#1B2432] leading-snug">
            {card.title}
          </h3>

          {/* Description */}
          <p className="text-[#4A5568] leading-relaxed text-[0.95rem]">
            {card.description}
          </p>

          {/* Bullets */}
          <ul className="space-y-3 pt-1">
            {card.bullets.map((item, i) => (
              <motion.li
                key={i}
                custom={i}
                variants={bulletVariants}
                className="flex items-start gap-3"
              >
                <motion.div
                  className="w-6 h-6 rounded-full bg-[#C05621]/10 flex items-center justify-center flex-shrink-0 mt-0.5"
                  whileHover={{ scale: 1.2 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                >
                  <Check className="w-3.5 h-3.5 text-[#C05621] stroke-[2.5]" />
                </motion.div>
                <span className="text-[#1B2432] text-[0.9rem] leading-relaxed">{item}</span>
              </motion.li>
            ))}
          </ul>

          {/* CTA Button */}
          <div className="pt-3">
            <Link to={card.link}>
              <Button
                variant={card.variant}
                size="lg"
                className="group/btn relative overflow-hidden rounded-xl focus-visible:ring-2 focus-visible:ring-[#C05621] focus-visible:ring-offset-2"
              >
                {/* Shine sweep on hover */}
                <span
                  className="absolute inset-0 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700 ease-in-out
                              bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none"
                />
                <span className="relative z-10 flex items-center gap-2">
                  {card.cta}
                  <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover/btn:translate-x-1" />
                </span>
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function ValueProps() {
  return (
    <section
      className="relative py-28 overflow-hidden"
      style={{
        background: `
          radial-gradient(ellipse at 25% 40%, rgba(192,86,33,0.04) 0%, transparent 50%),
          radial-gradient(ellipse at 75% 60%, rgba(192,86,33,0.03) 0%, transparent 50%),
          #FDFCF8
        `,
      }}
    >
      <div className="container mx-auto px-6">
        <motion.div
          className="relative grid md:grid-cols-2 gap-8 lg:gap-6 max-w-6xl mx-auto items-stretch"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={containerVariants}
        >
          <ValueCard card={cards[0]} />
          <ValueCard card={cards[1]} />
        </motion.div>
      </div>
    </section>
  );
}
