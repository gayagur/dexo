import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { fadeUp } from './HeroSection';

export interface CategoryData {
  image: string;
  title: string;
  filterValue?: string;
  example: string;
  benefit: string;
}

interface CategoriesSectionProps {
  sectionLabel: string;
  heading: string;
  subheading: string;
  categories: CategoryData[];
  ctaButton?: { label: string; to: string; variant?: 'hero' | 'warm'; subtitle?: string };
}

const staggerContainer = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
};

const staggerItem = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  },
};

export function CategoriesSection({
  sectionLabel,
  heading,
  subheading,
  categories,
  ctaButton,
}: CategoriesSectionProps) {
  return (
    <section className="py-24" style={{ background: '#F9F5EF' }}>
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

        <motion.div
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
          variants={staggerContainer}
        >
          {categories.map((category, i) => {
            const browseUrl = category.filterValue
              ? `/browse-businesses?search=${encodeURIComponent(category.filterValue)}`
              : '/browse-businesses';

            return (
              <motion.div key={i} variants={staggerItem}>
                <Link to={browseUrl}>
                  <div
                    className="group overflow-hidden h-full bg-white cursor-pointer transition-all duration-[350ms]"
                    style={{
                      border: '1px solid rgba(0,0,0,0.06)',
                      borderRadius: '16px',
                      boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                    }}
                    onMouseEnter={(e) => {
                      const el = e.currentTarget;
                      el.style.boxShadow = '0 8px 30px rgba(0,0,0,0.10)';
                      el.style.transform = 'translateY(-4px)';
                      el.style.borderColor = 'rgba(201,106,61,0.2)';
                    }}
                    onMouseLeave={(e) => {
                      const el = e.currentTarget;
                      el.style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)';
                      el.style.transform = 'translateY(0)';
                      el.style.borderColor = 'rgba(0,0,0,0.06)';
                    }}
                  >
                    <div className="relative h-40 overflow-hidden">
                      <img
                        src={category.image}
                        alt={category.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-white via-white/30 to-transparent" />
                      {/* Icon gradient circle */}
                      <div
                        className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        style={{ background: 'linear-gradient(135deg, #C96A3D, #E8854D)' }}
                      >
                        <ArrowRight className="w-4 h-4 text-white" />
                      </div>
                    </div>
                    <div className="p-5">
                      <h3 className="font-serif text-lg mb-2" style={{ fontWeight: 600 }}>{category.title}</h3>
                      <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                        {category.example}
                      </p>
                      <div className="pt-3 border-t border-border">
                        <p className="text-xs text-primary font-medium">
                          ✦ {category.benefit}
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
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
              <Button variant={ctaButton.variant || 'warm'} size="lg">
                {ctaButton.label}
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            {ctaButton.subtitle && (
              <p className="text-sm text-muted-foreground mt-3">{ctaButton.subtitle}</p>
            )}
          </motion.div>
        )}
      </div>
    </section>
  );
}
