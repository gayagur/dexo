import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
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
    <section className="py-28" style={{ background: '#FDFCF8' }}>
      <motion.div
        className="container mx-auto px-6 text-center"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        custom={0}
        variants={fadeUp}
      >
        <h2 className="text-3xl md:text-5xl font-serif mb-6 text-[#1B2432]">
          {heading}
        </h2>
        <p className="text-xl text-[#4A5568] mb-12 max-w-2xl mx-auto leading-relaxed">
          {subheading}
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to={primaryCta.to} className="w-full sm:w-auto">
            <Button
              size="xl"
              className="bg-[#C05621] text-white hover:bg-[#A84A1C] h-14 w-full sm:w-auto px-8 sm:px-10 text-lg rounded-xl shadow-sm hover:shadow-md"
            >
              {primaryCta.label}
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
          {secondaryCta && (
            <Link to={secondaryCta.to} className="w-full sm:w-auto">
              <Button
                variant="outline"
                size="xl"
                className="border-[#1B2432]/20 text-[#1B2432] hover:bg-[#1B2432]/5 h-14 w-full sm:w-auto px-8 sm:px-10 text-lg rounded-xl"
              >
                {secondaryCta.label}
              </Button>
            </Link>
          )}
        </div>
      </motion.div>
    </section>
  );
}
