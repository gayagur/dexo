import { useRef, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/* ═══════════════════════════════════════════════════════════
   TYPES — swap scene content without changing animation
   ═══════════════════════════════════════════════════════════ */

interface CinematicHeroProps {
  titleLine: string;
  accentWord: string;
  subtitle: string;
  primaryCta: { label: string; to: string };
  secondaryCta?: { label: string; to: string };
  /** Height of the scroll container in vh (default 350) */
  scrollHeight?: number;
}

/* ═══════════════════════════════════════════════════════════
   SVG ROOM WIREFRAME — draws itself based on scroll progress
   ═══════════════════════════════════════════════════════════ */

function RoomWireframe({ progress }: { progress: number }) {
  // Draw from 0→1 as progress goes 0.15→0.5, then fade out 0.6→0.8
  const drawProgress = Math.min(1, Math.max(0, (progress - 0.15) / 0.35));
  const fadeOut = progress > 0.6 ? Math.max(0, 1 - (progress - 0.6) / 0.2) : 1;

  const strokeDash = `${drawProgress * 100} ${100 - drawProgress * 100}`;

  return (
    <svg
      viewBox="0 0 800 500"
      fill="none"
      className="absolute inset-0 w-full h-full"
      style={{ opacity: fadeOut * 0.35 }}
    >
      {/* Room perspective lines */}
      <line x1="100" y1="80" x2="350" y2="180" stroke="#C05621" strokeWidth="0.8" strokeDasharray={strokeDash} pathLength="100" />
      <line x1="700" y1="80" x2="450" y2="180" stroke="#C05621" strokeWidth="0.8" strokeDasharray={strokeDash} pathLength="100" />
      <line x1="100" y1="420" x2="350" y2="350" stroke="#C05621" strokeWidth="0.8" strokeDasharray={strokeDash} pathLength="100" />
      <line x1="700" y1="420" x2="450" y2="350" stroke="#C05621" strokeWidth="0.8" strokeDasharray={strokeDash} pathLength="100" />

      {/* Back wall */}
      <rect x="350" y="180" width="100" height="170" stroke="#C05621" strokeWidth="0.6" strokeDasharray={strokeDash} pathLength="100" fill="none" rx="2" />

      {/* Floor grid lines */}
      {[0, 1, 2, 3].map(i => (
        <line
          key={`floor-${i}`}
          x1={200 + i * 50} y1={420 - i * 18}
          x2={600 - i * 50} y2={420 - i * 18}
          stroke="#C05621"
          strokeWidth="0.4"
          strokeDasharray={strokeDash}
          pathLength="100"
          opacity={0.5 - i * 0.1}
        />
      ))}

      {/* Furniture outlines — simple shapes */}
      {/* Table */}
      <rect x="320" y="280" width="160" height="60" rx="4" stroke="#C05621" strokeWidth="0.7" strokeDasharray={strokeDash} pathLength="100" fill="none" />
      {/* Chair left */}
      <rect x="260" y="290" width="40" height="50" rx="6" stroke="#C05621" strokeWidth="0.5" strokeDasharray={strokeDash} pathLength="100" fill="none" />
      {/* Chair right */}
      <rect x="500" y="290" width="40" height="50" rx="6" stroke="#C05621" strokeWidth="0.5" strokeDasharray={strokeDash} pathLength="100" fill="none" />

      {/* Window on back wall */}
      <rect x="365" y="195" width="70" height="50" rx="2" stroke="#C05621" strokeWidth="0.5" strokeDasharray={strokeDash} pathLength="100" fill="none" />
      {/* Window cross */}
      <line x1="400" y1="195" x2="400" y2="245" stroke="#C05621" strokeWidth="0.3" strokeDasharray={strokeDash} pathLength="100" />
      <line x1="365" y1="220" x2="435" y2="220" stroke="#C05621" strokeWidth="0.3" strokeDasharray={strokeDash} pathLength="100" />

      {/* Lamp */}
      <line x1="560" y1="200" x2="560" y2="275" stroke="#C05621" strokeWidth="0.5" strokeDasharray={strokeDash} pathLength="100" />
      <ellipse cx="560" cy="200" rx="18" ry="10" stroke="#C05621" strokeWidth="0.5" strokeDasharray={strokeDash} pathLength="100" fill="none" />

      {/* Dimension lines */}
      <line x1="130" y1="100" x2="130" y2="400" stroke="#C05621" strokeWidth="0.3" strokeDasharray="3 4" opacity={drawProgress * 0.3} />
      <line x1="140" y1="440" x2="660" y2="440" stroke="#C05621" strokeWidth="0.3" strokeDasharray="3 4" opacity={drawProgress * 0.3} />

      {/* Measurement text */}
      <text x="115" y="260" fill="#C05621" fontSize="8" opacity={drawProgress * 0.25} textAnchor="middle" transform="rotate(-90, 115, 260)">3.2m</text>
      <text x="400" y="455" fill="#C05621" fontSize="8" opacity={drawProgress * 0.25} textAnchor="middle">4.8m</text>
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════
   FLOATING LIGHT ORBS — foreground depth particles
   ═══════════════════════════════════════════════════════════ */

function FloatingOrbs({ progress }: { progress: number }) {
  const orbs = useMemo(() => [
    { x: '15%', y: '25%', size: 120, speed: 0.3, delay: 0 },
    { x: '78%', y: '35%', size: 80, speed: 0.2, delay: 0.1 },
    { x: '45%', y: '70%', size: 60, speed: 0.25, delay: 0.2 },
    { x: '85%', y: '65%', size: 100, speed: 0.15, delay: 0.15 },
    { x: '25%', y: '80%', size: 50, speed: 0.35, delay: 0.05 },
  ], []);

  return (
    <>
      {orbs.map((orb, i) => {
        // Orbs drift upward at different speeds
        const orbProgress = Math.max(0, progress - orb.delay);
        const yOffset = -orbProgress * orb.speed * 200;
        const opacity = Math.min(0.12, orbProgress * 0.3) * (progress < 0.9 ? 1 : Math.max(0, (1 - progress) * 10));

        return (
          <div
            key={i}
            className="absolute rounded-full pointer-events-none"
            style={{
              left: orb.x,
              top: orb.y,
              width: orb.size,
              height: orb.size,
              background: `radial-gradient(circle, rgba(201,106,61,${opacity * 2}), transparent 70%)`,
              transform: `translateY(${yOffset}px)`,
              filter: 'blur(30px)',
              willChange: 'transform',
            }}
          />
        );
      })}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════ */

export function CinematicHero({
  titleLine,
  accentWord,
  subtitle,
  primaryCta,
  secondaryCta,
  scrollHeight = 350,
}: CinematicHeroProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  const heroVideo = useMemo(() => {
    const videos = ['/dexo.mp4', '/dexo2.mp4', '/dexo3.mp4', '/dexo4.mp4'];
    return videos[Math.floor(Math.random() * videos.length)];
  }, []);

  // ── GSAP ScrollTrigger pin + progress ──
  useEffect(() => {
    const container = containerRef.current;
    const scene = sceneRef.current;
    if (!container || !scene) return;

    const st = ScrollTrigger.create({
      trigger: container,
      start: 'top top',
      end: 'bottom bottom',
      pin: scene,
      scrub: 0.5,
      onUpdate: (self) => {
        setProgress(self.progress);
      },
    });

    return () => {
      st.kill();
    };
  }, []);

  // ── Derived animation values from progress ──
  // Phase 1: Calm (0–0.2)
  // Phase 2: Discovery (0.2–0.45)
  // Phase 3: Formation (0.45–0.7)
  // Phase 4: Reveal (0.7–1.0)

  // Background gradient warmth increases
  const bgWarmth = Math.min(1, progress * 1.3);

  // Headline: visible at start, fades out mid, returns at end
  const headlineOpacity = progress < 0.15
    ? 1
    : progress < 0.35
      ? Math.max(0, 1 - (progress - 0.15) / 0.2)
      : progress > 0.75
        ? Math.min(1, (progress - 0.75) / 0.15)
        : 0;

  const headlineY = progress < 0.15
    ? 0
    : progress < 0.35
      ? -(progress - 0.15) * 150
      : progress > 0.75
        ? (1 - progress) * 100
        : -30;

  // Subtitle + CTA: visible only at start and end
  const subOpacity = progress < 0.1
    ? 1
    : progress < 0.25
      ? Math.max(0, 1 - (progress - 0.1) / 0.15)
      : progress > 0.8
        ? Math.min(1, (progress - 0.8) / 0.12)
        : 0;

  // Phase label text
  const phaseLabel = progress < 0.2
    ? ''
    : progress < 0.45
      ? 'Designing with AI...'
      : progress < 0.7
        ? 'Connecting with craftsmen...'
        : progress < 0.85
          ? 'Transforming your space...'
          : '';

  const phaseLabelOpacity = progress < 0.2
    ? 0
    : progress < 0.25
      ? (progress - 0.2) / 0.05
      : progress < 0.85
        ? 1
        : Math.max(0, 1 - (progress - 0.85) / 0.1);

  // Video: starts soft/blurred, gains clarity
  const videoBlur = Math.max(0, 12 - progress * 16);
  const videoSaturation = 0.3 + progress * 0.7;
  const videoScale = 1 + (1 - progress) * 0.06;
  const videoOpacity = 0.15 + progress * 0.55;

  // Wireframe layer moves slightly upward
  const wireframeY = -progress * 40;

  // Foreground layer moves faster
  const foregroundY = -progress * 120;

  // Main object subtle drift
  const mainY = -progress * 60;
  const mainScale = 0.97 + progress * 0.06;

  // Final CTA appearance
  const ctaFinalOpacity = progress > 0.85 ? Math.min(1, (progress - 0.85) / 0.1) : 0;

  // Progress bar
  const progressBarWidth = `${progress * 100}%`;

  return (
    <div
      ref={containerRef}
      className="relative"
      style={{ height: `${scrollHeight}vh` }}
    >
      {/* ── Pinned scene (100vh viewport) ── */}
      <div
        ref={sceneRef}
        className="w-full h-screen overflow-hidden"
      >
        {/* ═══ LAYER 0: Background ambient ═══ */}
        <div
          className="absolute inset-0 z-0 transition-none"
          style={{
            background: `
              radial-gradient(ellipse at 65% 15%, rgba(192,86,33,${0.04 + bgWarmth * 0.06}) 0%, transparent 50%),
              radial-gradient(ellipse at 20% 75%, rgba(201,169,110,${0.03 + bgWarmth * 0.04}) 0%, transparent 45%),
              linear-gradient(175deg,
                #FDFCF8 0%,
                hsl(30, ${40 + bgWarmth * 20}%, ${99 - bgWarmth * 2}%) 40%,
                hsl(28, ${35 + bgWarmth * 25}%, ${97 - bgWarmth * 3}%) 70%,
                #FDFCF8 100%
              )
            `,
          }}
        />

        {/* Noise texture */}
        <div className="absolute inset-0 z-[1] opacity-[0.035] pointer-events-none">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <filter id="heroNoise">
              <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="4" stitchTiles="stitch" />
              <feColorMatrix type="saturate" values="0" />
            </filter>
            <rect width="100%" height="100%" filter="url(#heroNoise)" />
          </svg>
        </div>

        {/* ═══ LAYER 1: Wireframe room outlines ═══ */}
        <div
          className="absolute inset-0 z-[2] pointer-events-none"
          style={{
            transform: `translateY(${wireframeY}px)`,
            willChange: 'transform',
          }}
        >
          <RoomWireframe progress={progress} />
        </div>

        {/* ═══ LAYER 2: Main hero video/object ═══ */}
        <div
          className="absolute inset-0 z-[3] flex items-center justify-center pointer-events-none"
          style={{
            transform: `translateY(${mainY}px) scale(${mainScale})`,
            willChange: 'transform',
          }}
        >
          <div
            className="relative w-[min(85vw,640px)] aspect-[4/3] rounded-[28px] overflow-hidden"
            style={{
              boxShadow: `0 ${20 + progress * 30}px ${60 + progress * 40}px rgba(25,15,8,${0.08 + progress * 0.14})`,
              opacity: videoOpacity,
            }}
          >
            <video
              autoPlay
              loop
              muted
              playsInline
              preload="metadata"
              className="absolute inset-0 w-full h-full object-cover"
              style={{
                filter: `blur(${videoBlur}px) saturate(${videoSaturation})`,
                transform: `scale(${videoScale})`,
              }}
            >
              <source src={heroVideo} type="video/mp4" />
            </video>

            {/* Inner glow ring */}
            <div className="absolute inset-0 rounded-[28px] ring-1 ring-inset ring-white/20 pointer-events-none" />

            {/* Bottom gradient vignette */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/15 via-transparent to-transparent pointer-events-none" />
          </div>
        </div>

        {/* ═══ LAYER 3: Foreground floating orbs ═══ */}
        <div
          className="absolute inset-0 z-[4] pointer-events-none"
          style={{
            transform: `translateY(${foregroundY}px)`,
            willChange: 'transform',
          }}
        >
          <FloatingOrbs progress={progress} />
        </div>

        {/* ═══ LAYER 4: Text + CTAs ═══ */}
        <div className="absolute inset-0 z-[10] flex flex-col items-center justify-center pointer-events-none">
          <div className="max-w-4xl mx-auto px-6 text-center">
            {/* Main headline */}
            <div
              style={{
                opacity: headlineOpacity,
                transform: `translateY(${headlineY}px)`,
                transition: 'none',
              }}
            >
              <h1
                className="font-bold text-[#1B2432] mb-3"
                style={{
                  fontFamily: "'Instrument Serif', 'Playfair Display', serif",
                  fontSize: 'clamp(2.8rem, 6vw, 5rem)',
                  lineHeight: 1.08,
                  letterSpacing: '-0.03em',
                }}
              >
                {titleLine}
              </h1>
              <span
                className="hero-accent-shimmer block font-bold mb-6"
                style={{
                  fontFamily: "'Instrument Serif', 'Playfair Display', serif",
                  fontSize: 'clamp(2.8rem, 6vw, 5rem)',
                  lineHeight: 1.08,
                  letterSpacing: '-0.03em',
                }}
              >
                {accentWord}
              </span>
            </div>

            {/* Subtitle */}
            <p
              className="text-lg md:text-xl text-[#4A5568] leading-[1.7] max-w-xl mx-auto mb-8"
              style={{ opacity: subOpacity }}
            >
              {subtitle}
            </p>

            {/* Initial CTAs (visible at start) */}
            <div
              className="flex flex-col sm:flex-row items-center gap-4 justify-center pointer-events-auto"
              style={{ opacity: subOpacity }}
            >
              <Link to={primaryCta.to}>
                <button
                  className="cta-pulse cta-shimmer group h-14 px-8 sm:px-10 text-base rounded-xl font-medium text-white flex items-center gap-2 cursor-pointer"
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
                <Link to={secondaryCta.to}>
                  <button
                    className="h-14 px-8 sm:px-10 text-base rounded-xl font-medium text-[#1B2432] flex items-center gap-2 cursor-pointer transition-all duration-300 hover:bg-white/90"
                    style={{
                      background: 'rgba(255,255,255,0.7)',
                      backdropFilter: 'blur(8px)',
                      border: '1px solid rgba(255,255,255,0.9)',
                    }}
                  >
                    {secondaryCta.label}
                  </button>
                </Link>
              )}
            </div>

            {/* Phase label (appears mid-scroll) */}
            <div
              className="mt-6"
              style={{ opacity: phaseLabelOpacity }}
            >
              <span
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium"
                style={{
                  background: 'rgba(192,86,33,0.08)',
                  color: '#C05621',
                  backdropFilter: 'blur(8px)',
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#C05621] animate-pulse" />
                {phaseLabel}
              </span>
            </div>

            {/* Final CTA (appears at end of scroll) */}
            <div
              className="mt-8 pointer-events-auto"
              style={{ opacity: ctaFinalOpacity }}
            >
              <p className="text-sm text-[#4A5568] mb-4">Your space, reimagined.</p>
              <Link to={primaryCta.to}>
                <button
                  className="cta-shimmer group h-14 px-10 text-base rounded-xl font-medium text-white flex items-center gap-2 cursor-pointer mx-auto transition-all duration-300 hover:scale-[1.03]"
                  style={{
                    background: 'linear-gradient(135deg, #C96A3D, #E8854D)',
                    boxShadow: '0 8px 32px rgba(201,106,61,0.30)',
                  }}
                >
                  Start Your Project
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </button>
              </Link>
            </div>
          </div>
        </div>

        {/* ═══ Scroll progress indicator ═══ */}
        <div className="absolute bottom-0 left-0 right-0 z-[20] h-[2px]">
          <div
            className="h-full"
            style={{
              width: progressBarWidth,
              background: 'linear-gradient(90deg, transparent, #C05621)',
              opacity: progress > 0.02 && progress < 0.95 ? 0.4 : 0,
              transition: 'opacity 0.3s',
            }}
          />
        </div>

        {/* ═══ Scroll hint (fades out quickly) ═══ */}
        <div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[20] flex flex-col items-center gap-2"
          style={{ opacity: Math.max(0, 1 - progress * 8) }}
        >
          <span className="text-xs text-[#4A5568]/60 font-medium uppercase tracking-widest">
            Scroll to explore
          </span>
          <div className="w-5 h-8 rounded-full border border-[#4A5568]/20 flex justify-center pt-1.5">
            <div className="w-1 h-2 rounded-full bg-[#C05621]/40 animate-bounce" />
          </div>
        </div>
      </div>
    </div>
  );
}
