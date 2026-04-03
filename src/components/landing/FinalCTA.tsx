import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { fadeUp } from './HeroSection';

interface CtaButton {
  label: string;
  to: string;
}

interface FinalCTAProps {
  heading: string;
  subheading: string;
  primaryCta: CtaButton;
  secondaryCta?: CtaButton;
}

export function FinalCTA({
  heading,
  subheading,
  primaryCta,
  secondaryCta,
}: FinalCTAProps) {
  return (
    <section
      className="relative py-28 overflow-hidden"
      style={{ background: '#1A1008' }}
    >
      {/* Noise texture overlay */}
      <div className="absolute inset-0 opacity-[0.06] pointer-events-none z-[1]">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <filter id="ctaNoise">
            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="4" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#ctaNoise)" />
        </svg>
      </div>

      {/* Radial glow behind headline */}
      <div
        className="absolute pointer-events-none z-0"
        style={{
          top: '20%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '700px',
          height: '400px',
          background: 'radial-gradient(ellipse, rgba(201,106,61,0.15), transparent 65%)',
        }}
      />

      <motion.div
        className="relative z-[2] container mx-auto px-6 text-center"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        custom={0}
        variants={fadeUp}
      >
        <h2
          className="text-3xl md:text-5xl font-serif mb-6"
          style={{
            color: '#FFF5EB',
            fontWeight: 700,
            letterSpacing: '-0.02em',
          }}
        >
          {heading}
        </h2>
        <p
          className="text-xl mb-12 max-w-2xl mx-auto leading-relaxed"
          style={{ color: 'rgba(255,245,235,0.65)' }}
        >
          {subheading}
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to={primaryCta.to} className="w-full sm:w-auto">
            <button
              className="cta-shimmer group h-14 w-full sm:w-auto px-8 sm:px-10 text-lg rounded-xl font-medium flex items-center justify-center gap-2 cursor-pointer transition-all duration-300 hover:scale-[1.03]"
              style={{
                background: '#FFF5EB',
                color: '#1A1008',
                boxShadow: '0 4px 24px rgba(255,245,235,0.15)',
              }}
            >
              {primaryCta.label}
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </button>
          </Link>
          {secondaryCta && (
            <Link to={secondaryCta.to} className="w-full sm:w-auto">
              <button
                className="h-14 w-full sm:w-auto px-8 sm:px-10 text-lg rounded-xl font-medium flex items-center justify-center gap-2 cursor-pointer transition-all duration-300 hover:bg-white/10"
                style={{
                  color: '#FFF5EB',
                  border: '1px solid rgba(255,245,235,0.2)',
                  background: 'transparent',
                }}
              >
                {secondaryCta.label}
              </button>
            </Link>
          )}
        </div>
      </motion.div>
    </section>
  );
}
