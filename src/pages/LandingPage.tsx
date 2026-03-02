import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { PremiumTestimonials } from '@/components/PremiumTestimonials';
import { ValueProps } from '@/components/ValueProps';

// Step images
import stepDesign from '@/assets/step-design.jpg';
import stepCreate from '@/assets/step-create.jpg';
import stepReceive from '@/assets/step-receive.jpg';

// Category images
import categoryJewelry from '@/assets/category-jewelry.jpg';
import categoryCakes from '@/assets/category-cakes.jpg';
import categoryFurniture from '@/assets/category-furniture.jpg';
import categoryFashion from '@/assets/category-fashion.jpg';
import categoryCeramics from '@/assets/category-ceramics.jpg';
import categoryGifts from '@/assets/category-gifts.jpg';
import categoryTextiles from '@/assets/category-textiles.jpg';
import category3dprint from '@/assets/category-3dprint.jpg';

// ── Animated floating paths for hero background ──────────────────
function FloatingPaths({ position }: { position: number }) {
  const paths = Array.from({ length: 36 }, (_, i) => ({
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
      <svg
        className="w-full h-full"
        viewBox="0 0 696 316"
        fill="none"
      >
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

// ── Single reusable fade-up variant ──────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay, ease: [0.25, 0.1, 0.25, 1.0] },
  }),
};

const LandingPage = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const businessCategories = [
    {
      image: categoryJewelry,
      title: "Jewelry & Goldsmiths",
      example: "Custom engagement rings, personalized necklaces",
      benefit: "Receive detailed design specs with exact measurements and style references",
    },
    {
      image: categoryCakes,
      title: "Custom Cake Creators",
      example: "Wedding cakes, themed birthday creations",
      benefit: "Get clear visual briefs with flavor preferences and event details upfront",
    },
    {
      image: categoryFurniture,
      title: "Furniture & Woodworkers",
      example: "Bespoke tables, custom shelving units",
      benefit: "Clients arrive with dimensions, material choices, and budget ready",
    },
    {
      image: categoryFashion,
      title: "Fashion & Tailors",
      example: "Custom suits, redesigned vintage pieces",
      benefit: "Fewer revision rounds with AI-generated style mockups",
    },
    {
      image: categoryCeramics,
      title: "Ceramic Artists",
      example: "Custom dinnerware sets, sculptural pieces",
      benefit: "Matched with clients who value handmade artistry",
    },
    {
      image: categoryGifts,
      title: "Personalized Gift Studios",
      example: "Engraved items, custom packaging",
      benefit: "Receive ready-to-produce briefs with personalization details",
    },
    {
      image: categoryTextiles,
      title: "Textile & Embroidery",
      example: "Custom quilts, monogrammed linens",
      benefit: "Visual references and color palettes provided upfront",
    },
    {
      image: category3dprint,
      title: "3D Printing & Prototyping",
      example: "Custom figurines, product prototypes",
      benefit: "Get AI-assisted 3D concepts before production starts",
    },
  ];

  const steps = [
    {
      image: stepDesign,
      alt: "Customer designing with AI on laptop",
      number: 1,
      title: "Design",
      badge: "AI-Powered",
      description: 'Describe your idea in words. Our AI instantly generates <strong>visual design images</strong> of your product — jewelry, furniture, cakes, or fashion.',
      items: [
        "You describe your vision in simple words",
        "<strong>AI generates visual mockups</strong> of your product",
        "Refine until it matches your vision",
      ],
      footer: { title: "You + AI", sub: "Turn ideas into visual designs before production" },
    },
    {
      image: stepCreate,
      alt: "Skilled artisan jeweler crafting custom piece",
      number: 2,
      title: "Create",
      priceBadges: ["$2,400", "3 weeks"],
      description: 'Matched creators receive your visual brief. They review your AI design and submit offers with <strong>pricing, timeline, and their approach</strong>.',
      items: [
        "Makers see your visual design + details",
        "They submit <strong>price + timeline offers</strong>",
        "You choose who to work with",
      ],
      footer: { title: "Skilled Makers", sub: "Real artisans ready to bring your design to life" },
    },
    {
      image: stepReceive,
      alt: "Happy customer receiving custom jewelry",
      number: 3,
      title: "Receive",
      ratingBadge: "★ 5.0 Perfect",
      description: 'Your custom product is crafted and delivered. <strong>Exactly what you envisioned</strong> — no endless searching, no miscommunication.',
      items: [
        "Maker crafts your one-of-a-kind piece",
        "Track progress with updates",
        "<strong>Receive your finished product</strong>",
      ],
      footer: { title: "Happy You", sub: "One-of-a-kind products made just for you" },
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-background/80 backdrop-blur-md border-b border-border/50'
            : 'bg-transparent'
        }`}
      >
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-3xl font-serif font-semibold text-primary">DEXO</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/auth">
              <Button variant="ghost" size="default">Sign in</Button>
            </Link>
            <Link to="/auth">
              <Button size="default">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ═══════════════ Hero ═══════════════ */}
      <section
        className="relative min-h-screen flex items-center justify-center pt-16"
        style={{
          background: `
            radial-gradient(ellipse at 70% 15%, rgba(192,86,33,0.05) 0%, transparent 50%),
            radial-gradient(ellipse at 20% 80%, rgba(201,169,110,0.04) 0%, transparent 40%),
            #FDFCF8
          `,
        }}
      >
        {/* Animated floating paths */}
        <FloatingPaths position={1} />
        <FloatingPaths position={-1} />
        <div className="relative z-10 container mx-auto px-6 py-24 text-center">
          <motion.div
            className="max-w-4xl mx-auto space-y-8"
            initial="hidden"
            animate="visible"
          >
            {/* Title */}
            <motion.h1
              custom={0}
              variants={fadeUp}
              className="text-6xl md:text-7xl lg:text-8xl font-serif font-bold leading-[1.05] text-[#1B2432]"
            >
              From idea to reality,
            </motion.h1>

            {/* "together" */}
            <motion.span
              custom={0.12}
              variants={fadeUp}
              className="text-6xl md:text-7xl lg:text-8xl font-serif font-bold text-[#C05621] block"
            >
              together
            </motion.span>

            {/* Subtitle */}
            <motion.p
              custom={0.25}
              variants={fadeUp}
              className="text-xl text-[#4A5568] max-w-2xl mx-auto leading-[1.8]"
            >
              Design your vision with AI. Connect with skilled creators.
              Receive your custom-made product — jewelry, furniture, cakes, fashion, and more.
            </motion.p>

            {/* Buttons */}
            <motion.div
              custom={0.38}
              variants={fadeUp}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
            >
              <Link to="/auth?role=customer">
                <Button variant="hero" size="xl" className="group h-14 px-10 text-lg rounded-xl shadow-lg shadow-primary/20">
                  Start Your Project
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link to="/auth?role=business">
                <Button variant="outline" size="xl" className="h-14 px-10 text-lg rounded-xl border-[#1B2432]/20 text-[#1B2432] hover:bg-[#1B2432]/5">
                  Join as a Creator
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════ 3-Step Visual Flow ═══════════════ */}
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
            <span className="text-sm font-medium text-primary uppercase tracking-wider">How DEXO Works</span>
            <h2 className="text-3xl md:text-4xl font-serif mt-2 mb-4">Three steps. One seamless journey.</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Design with AI • Connect with skilled makers • Receive your custom product
            </p>
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

          <motion.div
            className="mt-12 text-center"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            custom={0}
            variants={fadeUp}
          >
            <Link to="/auth?role=customer">
              <Button variant="hero" size="lg" className="group">
                Start Your Custom Project
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════ Business Categories ═══════════════ */}
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
            <span className="text-sm font-medium text-primary uppercase tracking-wider">For Creators & Makers</span>
            <h2 className="text-3xl md:text-4xl font-serif mt-2 mb-4">Built for every craft</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Whether you're a jeweler, baker, woodworker, or fashion designer — DEXO connects you with clients who are ready to buy, with clear briefs and realistic budgets.
            </p>
          </motion.div>

          {/* Single animated wrapper for the entire grid — no per-card motion */}
          <motion.div
            className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-40px" }}
            custom={0.1}
            variants={fadeUp}
          >
            {businessCategories.map((category, i) => (
              <Card
                key={i}
                hover
                className="group overflow-hidden h-full bg-white/70 backdrop-blur-xl border border-white/50 shadow-sm hover:shadow-md"
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
            ))}
          </motion.div>

          <motion.div
            className="mt-12 text-center"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            custom={0}
            variants={fadeUp}
          >
            <Link to="/auth?role=business">
              <Button variant="warm" size="lg">
                Join as a Creator
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <p className="text-sm text-muted-foreground mt-3">Free to join • No monthly fees • Only pay when you work</p>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════ Value Props ═══════════════ */}
      <ValueProps />

      {/* ═══════════════ Testimonials ═══════════════ */}
      <PremiumTestimonials />

      {/* ═══════════════ Final CTA ═══════════════ */}
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
            Ready to create something unique?
          </h2>
          <p className="text-xl text-[#4A5568] mb-12 max-w-2xl mx-auto leading-relaxed">
            Whether you have a clear vision or just a spark of an idea,
            DEXO helps you bring it to life with the right creator.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/auth?role=customer">
              <Button
                size="xl"
                className="bg-[#C05621] text-white hover:bg-[#A84A1C] h-14 px-10 text-lg rounded-xl shadow-sm hover:shadow-md"
              >
                Start Your Project
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <Link to="/auth?role=business">
              <Button
                variant="outline"
                size="xl"
                className="border-[#1B2432]/20 text-[#1B2432] hover:bg-[#1B2432]/5 h-14 px-10 text-lg rounded-xl"
              >
                Join as a Creator
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-serif font-semibold text-primary">DEXO</span>
            </div>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <Link to="/browse-businesses" className="hover:text-foreground transition-colors">Browse Creators</Link>
              <Link to="/auth?role=business" className="hover:text-foreground transition-colors">Become a Creator</Link>
            </div>
            <div className="text-sm text-muted-foreground">
              © 2026 DEXO. Crafted with care.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
