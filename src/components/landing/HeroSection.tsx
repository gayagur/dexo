import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay, ease: [0.25, 0.1, 0.25, 1.0] },
  }),
};

/* ── Floating SVG wave paths ─────────────────────────────────── */

function FloatingPaths({ position, count = 36 }: { position: number; count?: number }) {
  const paths = Array.from({ length: count }, (_, i) => ({
    id: i,
    d: `M-${380 - i * 5 * position} -${189 + i * 6}C-${
      380 - i * 5 * position
    } -${189 + i * 6} -${312 - i * 5 * position} ${216 - i * 6} ${
      152 - i * 5 * position
    } ${343 - i * 6}C${616 - i * 5 * position} ${470 - i * 6} ${
      684 - i * 5 * position
    } ${875 - i * 6} ${684 - i * 5 * position} ${875 - i * 6}`,
    width: 0.5 + i * 0.03,
  }));

  return (
    <div className="absolute inset-0 pointer-events-none">
      <svg className="w-full h-full" viewBox="0 0 696 316" fill="none">
        <title>Background Paths</title>
        {paths.map((path) => (
          <motion.path
            key={path.id}
            d={path.d}
            stroke="#C05621"
            strokeWidth={path.width}
            strokeOpacity={0.04 + path.id * 0.005}
            initial={{ pathLength: 0.3, opacity: 0.6 }}
            animate={{
              pathLength: 1,
              opacity: [0.3, 0.6, 0.3],
              pathOffset: [0, 1, 0],
            }}
            transition={{
              duration: 20 + Math.random() * 10,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
        ))}
      </svg>
    </div>
  );
}

/* ── Types ────────────────────────────────────────────────────── */

interface CtaButton {
  label: string;
  to: string;
  variant?: 'hero' | 'outline';
}

interface HeroSectionProps {
  titleLine: string;
  accentWord: string;
  subtitle: string;
  primaryCta: CtaButton;
  secondaryCta?: CtaButton;
  pathCount?: number;
}

/* ── Component ────────────────────────────────────────────────── */

export function HeroSection({
  titleLine,
  accentWord,
  subtitle,
  primaryCta,
  secondaryCta,
  pathCount = 36,
}: HeroSectionProps) {
  const [bgVideoReady, setBgVideoReady] = useState(false);
  const heroVideo = useMemo(() => (Math.random() < 0.5 ? '/dexo.mp4' : '/dexo2.mp4'), []);

  return (
    <div className="relative">
      {/* ═══ Hero section ═══ */}
      <section className="relative min-h-screen">

        {/* Background container (clipped) */}
        <div className="absolute inset-0 overflow-hidden">

          {/* Layer A: Background video wash */}
          <video
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            onLoadedData={() => setBgVideoReady(true)}
            className={`pointer-events-none absolute inset-0 w-full h-full object-cover z-0 transition-opacity duration-1000 hidden lg:block scale-[1.08] ${
              bgVideoReady ? 'opacity-[0.12]' : 'opacity-0'
            }`}
            style={{ filter: 'blur(18px) saturate(0.95)' }}
          >
            <source src={heroVideo} type="video/mp4" />
          </video>

          {/* Layer B: Warm base + cream wash */}
          <div
            className="absolute inset-0 z-0"
            style={{
              background: `
                radial-gradient(ellipse at 70% 15%, rgba(192,86,33,0.05) 0%, transparent 50%),
                radial-gradient(ellipse at 20% 80%, rgba(201,169,110,0.04) 0%, transparent 40%),
                #FDFCF8
              `,
            }}
          />
          <div className="pointer-events-none absolute inset-0 z-[1] bg-[#FFF8F3]/35" />

          {/* Layer C: Warm light bloom radials */}
          <div className="pointer-events-none absolute -top-32 -left-32 z-[2] h-[480px] w-[480px] rounded-full bg-[radial-gradient(circle,rgba(197,92,42,0.14),transparent_60%)]" />
          <div className="pointer-events-none absolute top-16 -right-24 z-[2] h-[560px] w-[560px] rounded-full bg-[radial-gradient(circle,rgba(255,240,225,0.45),transparent_60%)] opacity-30" />
          <div className="pointer-events-none absolute -bottom-20 left-1/2 -translate-x-1/2 z-[2] h-[360px] w-[800px] rounded-full bg-[radial-gradient(ellipse,rgba(201,169,110,0.10),transparent_65%)]" />

          {/* Layer D: Floating wave paths */}
          <div className="absolute inset-0 z-[3]">
            <FloatingPaths position={1} count={pathCount} />
            <FloatingPaths position={-1} count={pathCount} />
          </div>
        </div>

        {/* ═══ Content: Text + video card side by side ═══ */}
        <div className="relative z-10 mx-auto max-w-7xl px-6 pt-32 pb-24 lg:pt-44 lg:pb-32 min-h-screen flex flex-col justify-center">
          <div className="relative">

            {/* Video card (behind text, right side) */}
            <motion.div
              className="hidden lg:block absolute z-[1] w-[560px]"
              style={{ top: '0', right: '5%' }}
              initial={{ opacity: 0, y: 30, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.25, 0.1, 0.25, 1.0] }}
            >
              <div className="relative">
                {/* Warm glow behind video */}
                <div className="pointer-events-none absolute -z-10 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] h-[320px] rounded-full bg-[#FF7A00]/10 blur-3xl" />

                {/* Bottom shadow glow */}
                <div className="absolute -bottom-6 left-10 right-10 h-12 rounded-full bg-black/10 blur-2xl" />

                <div
                  className="group relative aspect-[4/3] overflow-hidden rounded-[28px] border border-black/10 transition-all duration-250 ease-out hover:-translate-y-1"
                  style={{
                    boxShadow: '0 32px 80px rgba(25,15,8,0.18), 0 8px 28px rgba(25,15,8,0.08)',
                  }}
                >
                  <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload="metadata"
                    className="absolute inset-0 w-full h-full object-cover"
                  >
                    <source src={heroVideo} type="video/mp4" />
                  </video>

                  {/* Subtle bottom gradient */}
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />

                  {/* Inner glow ring */}
                  <div className="pointer-events-none absolute inset-0 rounded-[28px] ring-1 ring-inset ring-white/20" />
                </div>
              </div>
            </motion.div>

            {/* Text block (dominant, overlaps video) */}
            <motion.div
              className="relative z-[2] w-full lg:w-[65%] space-y-7 text-center lg:text-left"
              initial="hidden"
              animate="visible"
            >
              <motion.h1
                custom={0}
                variants={fadeUp}
                className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold leading-[1.08] text-[#1B2432]"
              >
                {titleLine}
              </motion.h1>

              <motion.span
                custom={0.12}
                variants={fadeUp}
                className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-[#C05621] block"
              >
                {accentWord}
              </motion.span>

              <motion.p
                custom={0.25}
                variants={fadeUp}
                className="text-lg md:text-xl text-[#4A5568] leading-[1.7] max-w-xl mx-auto lg:mx-0"
              >
                {subtitle}
              </motion.p>

              <motion.div
                custom={0.38}
                variants={fadeUp}
                className="flex items-center gap-4 flex-wrap justify-center lg:justify-start pt-2"
              >
                <Link to={primaryCta.to}>
                  <Button
                    variant="hero"
                    size="lg"
                    className="group h-14 px-10 text-base rounded-xl shadow-lg shadow-primary/20"
                  >
                    {primaryCta.label}
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
                {secondaryCta && (
                  <Link to={secondaryCta.to}>
                    <Button
                      variant="outline"
                      size="lg"
                      className="h-14 px-10 text-base rounded-xl border-[#1B2432]/20 text-[#1B2432] hover:bg-[#1B2432]/5"
                    >
                      {secondaryCta.label}
                    </Button>
                  </Link>
                )}
              </motion.div>
            </motion.div>

            {/* Mobile: Video below text */}
            <motion.div
              className="lg:hidden mt-10 mx-auto w-full max-w-[420px]"
              initial={{ opacity: 0, y: 30, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.25, 0.1, 0.25, 1.0] }}
            >
              <div className="relative">
                <div className="absolute -bottom-6 left-10 right-10 h-12 rounded-full bg-black/10 blur-2xl" />
                <div
                  className="group relative aspect-[4/3] overflow-hidden rounded-[28px] border border-black/10"
                  style={{
                    boxShadow: '0 32px 80px rgba(25,15,8,0.18), 0 8px 28px rgba(25,15,8,0.08)',
                  }}
                >
                  <video autoPlay loop muted playsInline preload="metadata" className="absolute inset-0 w-full h-full object-cover">
                    <source src={heroVideo} type="video/mp4" />
                  </video>
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
                  <div className="pointer-events-none absolute inset-0 rounded-[28px] ring-1 ring-inset ring-white/20" />
                </div>
              </div>
            </motion.div>

          </div>
        </div>
      </section>
    </div>
  );
}
