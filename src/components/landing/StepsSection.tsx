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
          <h2 className="text-3xl md:text-4xl font-serif mt-2 mb-4">{heading}</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">{subheading}</p>
        </motion.div>

        <motion.div
          className="max-w-6xl mx-auto grid md:grid-cols-3 gap-6 lg:gap-8 relative"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
        >
          {steps.map((step, i) => (
            <motion.div
              key={step.number}
              className="relative group"
              custom={i * 0.15}
              variants={fadeUp}
            >
              <Card hover className="h-full bg-white/70 backdrop-blur-xl border border-white/50 shadow-sm hover:shadow-md overflow-hidden">
                <div className="relative h-56 overflow-hidden">
                  <img
                    src={step.image}
                    alt={step.alt}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent" />
                  <div className="absolute top-4 left-4 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg shadow-lg">
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
                  <h3 className="text-2xl font-serif mb-3 text-[#C05621]">{step.title}</h3>
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
