import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { fadeUp } from './HeroSection';

export interface StepData {
  image: string;
  alt: string;
  number: number;
  title: string;
  badge?: string;
  priceBadges?: string[];
  ratingBadge?: string;
  description: string;
  items: string[];
  footer: { title: string; sub: string };
}

interface StepsSectionProps {
  sectionLabel: string;
  heading: string;
  subheading: string;
  steps: StepData[];
  ctaButton?: { label: string; to: string; variant?: 'hero' | 'warm' };
}

const staggerContainer = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1 },
  },
};

const staggerItem = {
  hidden: { opacity: 0, y: 32 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
  },
};

export function StepsSection({
  sectionLabel,
  heading,
  subheading,
  steps,
  ctaButton,
}: StepsSectionProps) {
  return (
    <section className="py-24" style={{ background: '#FDFCF8' }}>
      <div className="container mx-auto px-6">
        <motion.div
          className="text-center mb-12"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          custom={0}
          variants={fadeUp}
        >
          <span className="text-sm font-medium text-primary uppercase tracking-wider">
            {sectionLabel}
          </span>
          <h2
            className="text-3xl md:text-4xl font-serif mt-2 mb-4"
            style={{ fontWeight: 700, letterSpacing: '-0.02em' }}
          >
            {heading}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">{subheading}</p>
        </motion.div>

        {/* Steps grid with connecting line */}
        <motion.div
          className="max-w-6xl mx-auto grid md:grid-cols-3 gap-6 lg:gap-8 relative"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={staggerContainer}
        >
          {/* Vertical connecting line (hidden on mobile) */}
          <div
            className="hidden md:block absolute top-1/2 left-0 right-0 h-[1px] pointer-events-none z-0"
            style={{
              background: 'linear-gradient(90deg, transparent 10%, rgba(192,86,33,0.12) 30%, rgba(192,86,33,0.12) 70%, transparent 90%)',
            }}
          />

          {steps.map((step) => (
            <motion.div
              key={step.number}
              className="relative group z-[1]"
              variants={staggerItem}
            >
              {/* Editorial large numeral behind card */}
              <span
                className="absolute -top-4 -left-2 z-[2] pointer-events-none select-none font-serif"
                style={{
                  fontSize: '4rem',
                  fontWeight: 700,
                  opacity: 0.08,
                  lineHeight: 1,
                  color: '#C05621',
                }}
              >
                {step.number}
              </span>

              <Card
                hover
                className="h-full bg-white border border-[rgba(0,0,0,0.06)] shadow-[0_2px_12px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.10)] hover:-translate-y-1 hover:border-[rgba(201,106,61,0.2)] overflow-hidden transition-all duration-[350ms]"
                style={{ borderRadius: '16px' }}
              >
                <div className="relative h-56 overflow-hidden">
                  <img
                    src={step.image}
                    alt={step.alt}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent" />
                  {/* Step number badge — gradient circle */}
                  <div
                    className="absolute top-4 left-4 w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg text-white shadow-lg"
                    style={{
                      background: 'linear-gradient(135deg, #C96A3D, #E8854D)',
                    }}
                  >
                    {step.number}
                  </div>
                  {step.badge && (
                    <div className="absolute top-4 right-4 px-3 py-1.5 bg-card/90 backdrop-blur-sm rounded-full text-xs font-medium flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-primary" />
                      {step.badge}
                    </div>
                  )}
                  {step.priceBadges && (
                    <div className="absolute bottom-4 right-4 flex gap-2">
                      {step.priceBadges.map((b) => (
                        <div key={b} className="px-2 py-1 bg-card/90 backdrop-blur-sm rounded text-xs font-medium">{b}</div>
                      ))}
                    </div>
                  )}
                  {step.ratingBadge && (
                    <div className="absolute top-4 right-4 px-3 py-1.5 bg-green-500/90 text-white rounded-full text-xs font-medium">
                      {step.ratingBadge}
                    </div>
                  )}
                </div>
                <CardContent className="p-8">
                  <h3 className="text-2xl font-serif mb-3 text-[#C05621]" style={{ fontWeight: 700 }}>{step.title}</h3>
                  <p
                    className="text-muted-foreground leading-relaxed mb-4"
                    dangerouslySetInnerHTML={{ __html: step.description }}
                  />
                  <div className="bg-[#FDFCF8] rounded-xl p-4 mb-4">
                    <div className="text-xs font-medium text-primary uppercase tracking-wide mb-2">What happens:</div>
                    <ul className="space-y-2 text-sm">
                      {step.items.map((item, j) => (
                        <li key={j} className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                          <span dangerouslySetInnerHTML={{ __html: item }} />
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="pt-3 border-t border-border">
                    <div className="text-sm font-medium text-foreground">{step.footer.title}</div>
                    <div className="text-xs text-muted-foreground mt-1">{step.footer.sub}</div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {ctaButton && (
          <motion.div
            className="mt-12 text-center"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            custom={0}
            variants={fadeUp}
          >
            <Link to={ctaButton.to}>
              <Button variant={ctaButton.variant || 'hero'} size="lg" className="group">
                {ctaButton.label}
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </motion.div>
        )}
      </div>
    </section>
  );
}
