import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Quote, Star, ArrowLeft, ArrowRight } from 'lucide-react';

const testimonials = [
  {
    name: "Noa Levine",
    role: "Interior Designer",
    company: "Modern Spaces Studio",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face",
    rating: 5,
    text: "Clients arrive with room dimensions, style preferences, and realistic budgets already defined. I spend my time designing, not deciphering vague requests.",
    results: ["3x more conversions", "Clear room briefs", "Less back-and-forth"]
  },
  {
    name: "Amit Reshef",
    role: "Carpenter & Woodworker",
    company: "Oak & Iron Woodworks",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
    rating: 5,
    text: "The AI-generated briefs include exact measurements and material preferences. I can quote accurately and start building faster than ever before.",
    results: ["70% less admin time", "Accurate quoting", "Happier homeowners"]
  },
  {
    name: "Maya Cohen",
    role: "Lighting Designer",
    company: "Lumen Lighting Design",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face",
    rating: 5,
    text: "I get matched with homeowners who need lighting plans for specific rooms. The briefs include room size, natural light conditions, and ambiance preferences. Game changer.",
    results: ["5x more projects", "Professional workflow", "Zero miscommunication"]
  },
  {
    name: "Daniel Katz",
    role: "Home Decorator",
    company: "Nest Interiors",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
    rating: 5,
    text: "The visual concepts help clients see possibilities before we even start. They arrive knowing their style, color palette, and budget. It makes every project smoother.",
    results: ["Steady lead flow", "Visual concepts", "Fair pricing"]
  },
  {
    name: "Shira Ben-David",
    role: "Office Design Specialist",
    company: "DeskFlow Ergonomics",
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&h=150&fit=crop&crop=face",
    rating: 5,
    text: "Workspace projects come with ergonomic requirements, team size, and workflow needs already mapped out. I can focus on creating productive environments.",
    results: ["Perfect client matches", "Higher project value", "More creative freedom"]
  }
];

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1, y: 0,
    transition: { duration: 0.7, ease: [0.25, 0.1, 0.25, 1.0] }
  }
};

export function PremiumTestimonials() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setDirection(1);
      setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 600 : -600,
      opacity: 0,
      scale: 0.95,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
      scale: 1,
    },
    exit: (dir: number) => ({
      zIndex: 0,
      x: dir < 0 ? 600 : -600,
      opacity: 0,
      scale: 0.95,
    })
  };

  const nextTestimonial = () => {
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  const current = testimonials[currentIndex];

  return (
    <section className="py-28 overflow-hidden" style={{ background: '#F9F5EF' }}>
      <motion.div
        className="max-w-7xl mx-auto px-6"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
      >
        {/* Header */}
        <motion.div className="text-center mb-16" variants={fadeUp}>
          <span className="text-sm font-medium text-[#C05621] uppercase tracking-wider">
            Designer Success Stories
          </span>
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-serif font-bold mt-3 mb-6 text-[#1B2432]">
            Loved by Designers & Creators
          </h2>
          <p className="text-lg text-[#4A5568] max-w-3xl mx-auto leading-relaxed">
            Join hundreds of designers and creators already transforming how they work with interior projects.
          </p>
        </motion.div>

        {/* Main Testimonial Card */}
        <motion.div className="relative max-w-5xl mx-auto mb-16" variants={fadeUp}>
          <div className="relative h-[480px] md:h-[360px]">
            <AnimatePresence initial={false} custom={direction}>
              <motion.div
                key={currentIndex}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  x: { type: "spring", stiffness: 300, damping: 30 },
                  opacity: { duration: 0.3 },
                  scale: { duration: 0.3 },
                }}
                className="absolute inset-0"
              >
                <div className="relative h-full bg-white/80 backdrop-blur-xl rounded-3xl border border-[#C05621]/[0.08] shadow-sm p-8 md:p-12 overflow-hidden">
                  {/* Large decorative quote mark */}
                  <span
                    className="absolute top-4 right-8 font-serif pointer-events-none select-none"
                    style={{ fontSize: '8rem', lineHeight: 1, opacity: 0.04, color: '#C05621' }}
                  >
                    "
                  </span>
                  {/* Quote icon */}
                  <Quote className="absolute top-8 right-8 w-14 h-14 text-[#C05621]/10" />

                  <div className="relative z-10 h-full flex flex-col md:flex-row items-center gap-8">
                    {/* Author info */}
                    <div className="flex-shrink-0 text-center md:text-left">
                      <div className="w-20 h-20 mx-auto md:mx-0 rounded-full overflow-hidden ring-2 ring-[#C05621]/20 ring-offset-2 ring-offset-[#F9F5EF] mb-5">
                        <img
                          src={current.avatar}
                          alt={current.name}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <h3 className="text-xl font-serif font-bold text-[#1B2432] mb-1">
                        {current.name}
                      </h3>
                      <p className="text-[#C05621] text-sm font-medium mb-0.5">
                        {current.role}
                      </p>
                      <p className="text-[#4A5568] text-sm mb-4">
                        {current.company}
                      </p>

                      <div className="flex justify-center md:justify-start gap-0.5">
                        {[...Array(current.rating)].map((_, i) => (
                          <Star key={i} className="w-4 h-4 fill-[#C05621] text-[#C05621]" />
                        ))}
                      </div>
                    </div>

                    {/* Quote + results */}
                    <div className="flex-1">
                      <blockquote className="text-lg md:text-xl text-[#1B2432] leading-relaxed mb-8 font-light italic">
                        "{current.text}"
                      </blockquote>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {current.results.map((result, i) => (
                          <div
                            key={i}
                            className="bg-[#FDFCF8] rounded-lg px-3 py-2.5 border border-[#C05621]/[0.08]"
                          >
                            <span className="text-sm text-[#4A5568] font-medium">{result}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation */}
          <div className="flex justify-center items-center gap-6 mt-8">
            <button
              onClick={prevTestimonial}
              className="p-3 rounded-full bg-white/80 backdrop-blur-sm border border-[#C05621]/[0.08] text-[#1B2432] hover:bg-white shadow-sm hover:shadow-md transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="flex gap-3">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setDirection(index > currentIndex ? 1 : -1);
                    setCurrentIndex(index);
                  }}
                  className={`w-2.5 h-2.5 rounded-full transition-all ${
                    index === currentIndex
                      ? 'bg-[#C05621] scale-125'
                      : 'bg-[#1B2432]/20 hover:bg-[#1B2432]/40'
                  }`}
                />
              ))}
            </div>

            <button
              onClick={nextTestimonial}
              className="p-3 rounded-full bg-white/80 backdrop-blur-sm border border-[#C05621]/[0.08] text-[#1B2432] hover:bg-white shadow-sm hover:shadow-md transition-all"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          className="grid grid-cols-2 md:grid-cols-4 gap-12 max-w-5xl mx-auto text-center pt-4"
          variants={fadeUp}
        >
          {[
            { number: "500+", label: "Happy Designers" },
            { number: "98%", label: "Satisfaction Rate" },
            { number: "10K+", label: "Spaces Transformed" },
            { number: "3x", label: "Faster Than DMs" }
          ].map((stat, index) => (
            <motion.div
              key={index}
              className="text-center"
              whileHover={{ scale: 1.08 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <div
                className="text-5xl md:text-6xl font-serif font-bold text-[#C05621] mb-2"
                style={{ textShadow: '0 2px 12px rgba(192,86,33,0.2)' }}
              >
                {stat.number}
              </div>
              <div className="text-sm md:text-base text-[#4A5568] font-medium">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
}
