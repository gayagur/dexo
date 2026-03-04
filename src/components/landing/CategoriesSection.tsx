import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
          <h2 className="text-3xl md:text-4xl font-serif mt-2 mb-4">{heading}</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">{subheading}</p>
        </motion.div>

        <motion.div
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
          custom={0.1}
          variants={fadeUp}
        >
          {categories.map((category, i) => {
            const browseUrl = category.filterValue
              ? `/browse-businesses?search=${encodeURIComponent(category.filterValue)}`
              : '/browse-businesses';

            return (
              <Link key={i} to={browseUrl}>
                <Card
                  hover
                  className="group overflow-hidden h-full bg-white/70 backdrop-blur-xl border border-white/50 shadow-sm hover:shadow-md cursor-pointer"
                >
                  <div className="relative h-40 overflow-hidden">
                    <img
                      src={category.image}
                      alt={category.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-card via-card/30 to-transparent" />
                  </div>
                  <CardContent className="p-5">
                    <h3 className="font-serif text-lg mb-2">{category.title}</h3>
                    <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                      {category.example}
                    </p>
                    <div className="pt-3 border-t border-border">
                      <p className="text-xs text-primary font-medium">
                        ✦ {category.benefit}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
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
