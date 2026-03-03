import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay, ease: [0.25, 0.1, 0.25, 1.0] },
  }),
};

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
              ease: "linear",
            }}
          />
        ))}
      </svg>
    </div>
  );
}

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
  fullScreen?: boolean;
}

export function HeroSection({
  titleLine,
  accentWord,
  subtitle,
  primaryCta,
  secondaryCta,
  pathCount = 36,
  fullScreen = true,
}: HeroSectionProps) {
  return (
    <section
      className={`relative flex items-center justify-center ${
        fullScreen ? 'min-h-screen pt-16' : 'pt-8 pb-20'
      }`}
      style={{
        background: `
          radial-gradient(ellipse at 70% 15%, rgba(192,86,33,0.05) 0%, transparent 50%),
          radial-gradient(ellipse at 20% 80%, rgba(201,169,110,0.04) 0%, transparent 40%),
          #FDFCF8
        `,
      }}
    >
      <FloatingPaths position={1} count={pathCount} />
      <FloatingPaths position={-1} count={pathCount} />
      <div className="relative z-10 container mx-auto px-6 py-24 text-center">
        <motion.div
          className="max-w-4xl mx-auto space-y-8"
          initial="hidden"
          animate="visible"
        >
          <motion.h1
            custom={0}
            variants={fadeUp}
            className="text-6xl md:text-7xl lg:text-8xl font-serif font-bold leading-[1.05] text-[#1B2432]"
          >
            {titleLine}
          </motion.h1>

          <motion.span
            custom={0.12}
            variants={fadeUp}
            className="text-6xl md:text-7xl lg:text-8xl font-serif font-bold text-[#C05621] block"
          >
            {accentWord}
          </motion.span>

          <motion.p
            custom={0.25}
            variants={fadeUp}
            className="text-xl text-[#4A5568] max-w-2xl mx-auto leading-[1.8]"
          >
            {subtitle}
          </motion.p>

          <motion.div
            custom={0.38}
            variants={fadeUp}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
          >
            <Link to={primaryCta.to}>
              <Button
                variant={primaryCta.variant || 'hero'}
                size="xl"
                className="group h-14 px-10 text-lg rounded-xl shadow-lg shadow-primary/20"
              >
                {primaryCta.label}
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            {secondaryCta && (
              <Link to={secondaryCta.to}>
                <Button
                  variant={secondaryCta.variant || 'outline'}
                  size="xl"
                  className="h-14 px-10 text-lg rounded-xl border-[#1B2432]/20 text-[#1B2432] hover:bg-[#1B2432]/5"
                >
                  {secondaryCta.label}
                </Button>
              </Link>
            )}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

export { fadeUp };
