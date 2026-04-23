import { useState, useMemo, useEffect, useRef } from 'react';
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
            whileInView={{
              pathLength: 1,
              opacity: [0.3, 0.6, 0.3],
              pathOffset: [0, 1, 0],
            }}
            viewport={{ once: false }}
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

/* ── Inline SVG noise filter ─────────────────────────────────── */

function NoiseOverlay() {
  return (
    <div className="noise-overlay">
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <filter id="noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="4" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#noise)" />
      </svg>
    </div>
  );
}

/* ── Floating decorative shapes ──────────────────────────────── */

function FloatingShapes() {
  return (
    <>
      {/* Shape 1 — large rounded rectangle, top-left */}
      <div
        className="float-shape pointer-events-none absolute -top-20 -left-16 w-64 h-40 rounded-3xl opacity-[0.05]"
        style={{ background: 'linear-gradient(135deg, #C05621, #E8854D)', transform: 'rotate(-12deg)' }}
      />
      {/* Shape 2 — circle, right side */}
      <div
        className="float-shape-slow pointer-events-none absolute top-1/3 -right-12 w-48 h-48 rounded-full opacity-[0.04]"
        style={{ background: 'radial-gradient(circle, #C05621, transparent)' }}
      />
      {/* Shape 3 — small blob, bottom-left */}
      <div
        className="float-shape pointer-events-none absolute bottom-24 left-1/4 w-32 h-24 rounded-[40%_60%_50%_40%] opacity-[0.06]"
        style={{ background: '#C9A66E', animationDuration: '8s' }}
      />
    </>
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
  pathCount = 12,
}: HeroSectionProps) {
  const [bgVideoReady, setBgVideoReady] = useState(false);
  const heroVideo = useMemo(() => {
    const videos = ['/dexo.mp4', '/dexo2.mp4', '/dexo3.mp4', '/dexo4.mp4'];
    return videos[Math.floor(Math.random() * videos.length)];
  }, []);

  // Parallax on hero video card (desktop only)
  const videoRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (typeof window === 'undefined' || window.innerWidth < 768) return;

    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (videoRef.current) {
          const displacement = Math.min(window.scrollY * 0.12, 60);
          videoRef.current.style.transform = `translateY(${displacement}px)`;
        }
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

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

          {/* Layer B: Rich layered gradient — warm cream → off-white → light amber */}
          <div
            className="absolute inset-0 z-0"
            style={{
              background: `
                radial-gradient(ellipse at 65% 10%, rgba(192,86,33,0.07) 0%, transparent 50%),
                radial-gradient(ellipse at 20% 75%, rgba(201,169,110,0.05) 0%, transparent 45%),
                linear-gradient(175deg, #FDFCF8 0%, #FFF9F3 40%, #FFF5EB 70%, #FDFCF8 100%)
              `,
            }}
          />
          <div className="pointer-events-none absolute inset-0 z-[1] bg-[#FFF8F3]/35" />

          {/* Layer B2: SVG noise texture overlay */}
          <NoiseOverlay />

          {/* Layer C: Warm light bloom radials */}
          <div className="pointer-events-none absolute -top-32 -left-32 z-[2] h-[480px] w-[480px] rounded-full bg-[radial-gradient(circle,rgba(197,92,42,0.14),transparent_60%)]" />
          <div
            className="pointer-events-none absolute z-[2] rounded-full"
            style={{
              top: '-5%',
              right: '10%',
              width: '600px',
              height: '600px',
              background: 'radial-gradient(circle, rgba(201,106,61,0.25), transparent 60%)',
              opacity: 0.25,
            }}
          />
          <div className="pointer-events-none absolute -bottom-20 left-1/2 -translate-x-1/2 z-[2] h-[360px] w-[800px] rounded-full bg-[radial-gradient(ellipse,rgba(201,169,110,0.10),transparent_65%)]" />

          {/* Layer D: Floating wave paths */}
          <div className="absolute inset-0 z-[3]">
            <FloatingPaths position={1} count={pathCount} />
            <FloatingPaths position={-1} count={pathCount} />
          </div>

          {/* Layer E: Floating decorative shapes */}
          <div className="absolute inset-0 z-[2]">
            <FloatingShapes />
          </div>
        </div>

        {/* ═══ Content: Text + video card side by side ═══ */}
        <div className="relative z-10 mx-auto max-w-7xl px-6 pt-32 pb-24 lg:pt-44 lg:pb-32 min-h-screen flex flex-col justify-center">
          <div className="relative">

            {/* Video card (behind text, right side) — with parallax */}
            <div
              ref={videoRef}
              className="hidden lg:block absolute z-[1] w-[40%] max-w-[560px] hero-scale-enter will-change-transform"
              style={{ top: '0', right: '0' }}
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
            </div>

            {/* Text block (dominant, overlaps video) */}
            <div className="relative z-[2] w-full lg:w-[58%] space-y-7 text-center lg:text-left">
              {/* Headline — Instrument Serif */}
              <h1
                className="hero-enter hero-enter-1 font-bold leading-[1.08] text-[#1B2432]"
                style={{
                  fontFamily: "'Instrument Serif', 'Playfair Display', serif",
                  fontSize: 'clamp(2.8rem, 6vw, 5rem)',
                  lineHeight: 1.1,
                  letterSpacing: '-0.03em',
                }}
              >
                {titleLine}
              </h1>

              {/* Accent word with shimmer */}
              <span
                className="hero-enter hero-enter-1 hero-accent-shimmer block font-bold"
                style={{
                  fontFamily: "'Instrument Serif', 'Playfair Display', serif",
                  fontSize: 'clamp(2.8rem, 6vw, 5rem)',
                  lineHeight: 1.1,
                  letterSpacing: '-0.03em',
                }}
              >
                {accentWord}
              </span>

              {/* Subtitle */}
              <p
                className="hero-enter hero-enter-2 text-lg md:text-xl text-[#4A5568] leading-[1.7] max-w-xl mx-auto lg:mx-0"
              >
                {subtitle}
              </p>

              {/* CTA Buttons */}
              <div
                className="hero-enter hero-enter-3 flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start pt-2"
              >
                <Link to={primaryCta.to}>
                  <button
                    className="cta-pulse cta-shimmer group h-14 w-full sm:w-auto px-8 sm:px-10 text-base rounded-xl font-medium text-white flex items-center gap-2 cursor-pointer"
                    style={{
                      background: 'linear-gradient(135deg, #C96A3D, #E8854D)',
                      boxShadow: '0 8px 32px rgba(201,106,61,0.30)',
                    }}
                  >
                    {primaryCta.label}
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </button>
                </Link>
                {secondaryCta && (
                  <Link to={secondaryCta.to} className="w-full sm:w-auto">
                    <button
                      className="h-14 w-full sm:w-auto px-8 sm:px-10 text-base rounded-xl font-medium text-[#1B2432] flex items-center justify-center gap-2 cursor-pointer transition-all duration-300 hover:bg-white/90"
                      style={{
                        background: 'rgba(255,255,255,0.7)',
                        backdropFilter: 'blur(8px)',
                        WebkitBackdropFilter: 'blur(8px)',
                        border: '1px solid rgba(255,255,255,0.9)',
                      }}
                    >
                      {secondaryCta.label}
                    </button>
                  </Link>
                )}
              </div>
            </div>

            {/* Mobile: Video below text */}
            <div
              className="lg:hidden mt-10 mx-auto w-full max-w-[420px] hero-scale-enter"
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
            </div>

          </div>
        </div>
      </section>
    </div>
  );
}
