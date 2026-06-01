import { useState, useEffect, useRef, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';
import { PremiumTestimonials } from '@/components/PremiumTestimonials';
import { CategoriesSection } from '@/components/landing/CategoriesSection';
import { ContainerScroll } from '@/components/ui/container-scroll';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { AnimatedSection } from '@/components/ui/AnimatedSection';
import dexoLogoFull from '@/assets/dexo-logo-full.png';

import { motion, useMotionValue, useSpring } from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Step images
import stepDesign from '@/assets/step-design.png';
import stepConnect from '@/assets/step-connect.png';
import stepTransform from '@/assets/step-transform.png';

// Category images
import categoryCarpentry from '@/assets/category-carpentry.png';
import categoryDecor from '@/assets/category-decor.png';
import categoryFurniture from '@/assets/category-furniture.png';
import categoryInterior from '@/assets/category-interior.png';
import categoryLighting from '@/assets/category-lighting.png';
import categoryWallart from '@/assets/category-wallart.png';
import categoryTextiles from '@/assets/category-textiles.jpg';
import categoryPlants from '@/assets/category-plants.png';
import categoryStorage from '@/assets/category-storage.png';
import categoryOffice from '@/assets/category-office.png';

gsap.registerPlugin(ScrollTrigger);

/* DATA */

const journeySteps = [
  {
    image: stepDesign,
    label: 'Step 01',
    title: 'Design with AI',
    body: 'Describe your space and style. Our AI generates visual concepts for your room before any work begins.',
    items: ['Describe your space and style', 'AI generates visual design concepts', 'Refine until it matches your vision'],
    accent: 'AI-Powered',
  },
  {
    image: stepConnect,
    label: 'Step 02',
    title: 'Connect with creators',
    body: 'Matched designers review your brief, see your AI concept, and submit offers with pricing and timeline.',
    items: ['Designers see your visual concept', 'They submit price + timeline offers', 'You choose who to work with'],
    accent: 'Smart Matching',
  },
  {
    image: stepTransform,
    label: 'Step 03',
    title: 'Transform your space',
    body: 'Your space is transformed exactly as you envisioned. No endless searching, no miscommunication.',
    items: ['Your designer brings the vision to life', 'Track progress with updates', 'Enjoy your transformed space'],
    accent: 'Beautiful Result',
  },
];

export const businessCategories = [
  { image: categoryCarpentry, title: "Carpentry & Woodworking", filterValue: "Carpentry & Woodworking", example: "Custom shelving, built-in cabinetry, wood paneling", benefit: "Clients arrive with room dimensions, material preferences, and budget ready" },
  { image: categoryDecor, title: "Home Decor & Styling", filterValue: "Home Decor & Styling", example: "Room styling, accessory curation, seasonal decor", benefit: "Receive visual briefs with style preferences and color palettes upfront" },
  { image: categoryInterior, title: "Interior Design & Space Planning", filterValue: "Interior Design & Space Planning", example: "Full room redesigns, open-plan layouts, renovations", benefit: "Get detailed room briefs with measurements, style direction, and realistic budgets" },
  { image: categoryLighting, title: "Lighting & Ambiance", filterValue: "Lighting & Ambiance", example: "Lighting plans, custom fixtures, mood lighting", benefit: "Matched with homeowners who need complete lighting solutions" },
  { image: categoryWallart, title: "Wall Art & Accessories", filterValue: "Wall Art & Decorative Accessories", example: "Gallery walls, custom art, decorative mirrors", benefit: "AI-generated visual concepts help clients see possibilities before committing" },
  { image: categoryFurniture, title: "Furniture Design & Restoration", filterValue: "Furniture Design & Restoration", example: "Custom tables, chair restoration, bespoke sofas", benefit: "Clients arrive with style, dimensions, and material preferences defined" },
  { image: categoryTextiles, title: "Textiles & Soft Furnishings", filterValue: "Textiles & Soft Furnishings", example: "Custom curtains, upholstery, rugs, cushions", benefit: "Visual references and fabric preferences provided upfront" },
  { image: categoryPlants, title: "Plants & Greenery Styling", filterValue: "Plants & Greenery Styling", example: "Indoor gardens, plant arrangements, green walls", benefit: "Briefs include room lighting, space, and care preferences" },
  { image: categoryStorage, title: "Storage & Organization", filterValue: "Storage & Organization Solutions", example: "Closet systems, pantry organization, shelving", benefit: "Receive ready-to-build briefs with space measurements and requirements" },
  { image: categoryOffice, title: "Office Design & Ergonomics", filterValue: "Office Design & Ergonomics", example: "Home office setups, ergonomic workspaces, team offices", benefit: "Workspace projects come with ergonomic needs and productivity goals" },
];

/* COMPONENT */

/* ─── Reduced-motion check ─── */
const prefersReducedMotion = typeof window !== 'undefined'
  ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
  : false;

/* ─── Stagger animation helpers ─── */
const staggerEase = [0.16, 1, 0.3, 1] as const;
const heroStagger = (delay: number) =>
  prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 24 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.7, delay, ease: staggerEase },
      };

/* ─── Floating orb config ─── */
const orbConfig = [
  {
    size: 600, color: '#B4552D', opacity: 0.08, blur: 120,
    pos: { top: '5%', right: '8%' },
    animate: prefersReducedMotion ? {} : { y: [0, -30, 0] },
    transition: { duration: 8, repeat: Infinity, ease: 'easeInOut' as const },
  },
  {
    size: 500, color: '#C8A97A', opacity: 0.10, blur: 100,
    pos: { bottom: '10%', left: '3%' },
    animate: prefersReducedMotion ? {} : { x: [0, 20, 0] },
    transition: { duration: 11, repeat: Infinity, ease: 'easeInOut' as const },
  },
  {
    size: 350, color: '#B4552D', opacity: 0.06, blur: 90,
    pos: { top: '35%', left: '15%' },
    animate: prefersReducedMotion ? {} : { scale: [1, 1.15, 1] },
    transition: { duration: 6, repeat: Infinity, ease: 'easeInOut' as const },
  },
];

const LandingPage = () => {
  const [scrolled, setScrolled] = useState(false);
  const mainRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);

  /* Cursor glow tracking */
  const mouseX = useMotionValue(-500);
  const mouseY = useMotionValue(-500);
  const smoothX = useSpring(mouseX, { stiffness: 100, damping: 30 });
  const smoothY = useSpring(mouseY, { stiffness: 100, damping: 30 });

  const heroVideo = useMemo(() => {
    const videos = ['/dexo.mp4', '/dexo2.mp4', '/dexo3.mp4', '/dexo4.mp4'];
    return videos[Math.floor(Math.random() * videos.length)];
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* Track mouse within hero for cursor glow */
  useEffect(() => {
    if (prefersReducedMotion) return;
    const hero = heroRef.current;
    if (!hero) return;
    const handleMove = (e: MouseEvent) => {
      const rect = hero.getBoundingClientRect();
      mouseX.set(e.clientX - rect.left - 150);
      mouseY.set(e.clientY - rect.top - 150);
    };
    const handleLeave = () => { mouseX.set(-500); mouseY.set(-500); };
    hero.addEventListener('mousemove', handleMove);
    hero.addEventListener('mouseleave', handleLeave);
    return () => {
      hero.removeEventListener('mousemove', handleMove);
      hero.removeEventListener('mouseleave', handleLeave);
    };
  }, [mouseX, mouseY]);

  /* GSAP scroll animations for value cards */
  useEffect(() => {
    const ctx = gsap.context(() => {

      gsap.set('.value-card', { opacity: 0, y: 32 });

      ScrollTrigger.batch('.value-card', {
        onEnter: (elements) => {
          gsap.to(elements, {
            opacity: 1, y: 0, stagger: 0.12,
            duration: 0.8, ease: 'power3.out', overwrite: true,
          });
        },
        start: 'top 85%',
      });

      gsap.utils.toArray<HTMLElement>('.value-card').forEach((card, i) => {
        gsap.to(card, {
          y: i % 2 === 0 ? -20 : -35,
          scrollTrigger: {
            trigger: card,
            start: 'top bottom',
            end: 'bottom top',
            scrub: 0.6,
          },
        });
      });

      gsap.from('.final-cta-content', {
        y: 50, opacity: 0, duration: 1, ease: 'power3.out',
        scrollTrigger: {
          trigger: '.final-cta-section',
          start: 'top 75%',
        },
      });

    }, mainRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={mainRef} className="bg-cream font-sans">
      <Helmet>
        <title>DEXO – AI-Powered Interior Design Marketplace</title>
        <meta name="description" content="Design your dream space with AI. Connect with skilled interior designers, carpenters, and decorators on DEXO." />
        <link rel="canonical" href="https://dexo.info/" />
        <meta property="og:url" content="https://dexo.info/" />
        <meta property="og:title" content="DEXO – AI-Powered Interior Design Marketplace" />
        <meta property="og:description" content="Design your dream space with AI. Connect with skilled interior designers, carpenters, and decorators." />
        <meta property="og:image" content="https://dexo.info/og-default.png" />
        <meta name="twitter:image" content="https://dexo.info/og-default.png" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            { "@type": "WebSite", "name": "DEXO", "url": "https://dexo.info", "description": "AI-Powered Interior Design Marketplace" },
            { "@type": "Organization", "name": "DEXO", "url": "https://dexo.info", "logo": "https://dexo.info/og-default.png", "description": "Design your dream space with AI.", "sameAs": [] },
          ],
        }) }} />
      </Helmet>

      {/* ═══ Navbar ═══ */}
      <motion.nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? 'backdrop-blur-md bg-cream/80 border-b border-navy/10'
            : 'bg-transparent'
        }`}
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="mx-auto max-w-7xl px-6 h-20 flex items-center justify-between">
          <Link to="/">
            <img src={dexoLogoFull} alt="DEXO" className="h-12 w-auto" />
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <Link to="/browse-businesses" className="nav-link text-sm font-sans font-medium text-navy/70 hover:text-navy transition-colors">
              Browse Designers
            </Link>
            <Link to="/blog" className="nav-link text-sm font-sans font-medium text-navy/70 hover:text-navy transition-colors">
              Blog
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/auth">
              <Button variant="ghost" size="default">Sign in</Button>
            </Link>
            <Link to="/auth">
              <Button variant="hero" size="default">Get Started</Button>
            </Link>
          </div>
        </div>
      </motion.nav>

      {/* ═══ Hero — ContainerScroll 3D card ═══ */}
      <div ref={heroRef} className="relative overflow-hidden hero-bg hero-grain">
        {/* Floating orbs — animated ambient background */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          {orbConfig.map((orb, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full"
              style={{
                width: orb.size,
                height: orb.size,
                background: orb.color,
                opacity: orb.opacity,
                filter: `blur(${orb.blur}px)`,
                ...orb.pos,
              }}
              animate={orb.animate}
              transition={orb.transition}
            />
          ))}
        </div>

        {/* Cursor glow */}
        {!prefersReducedMotion && (
          <motion.div
            className="absolute rounded-full pointer-events-none z-[1]"
            style={{
              width: 300,
              height: 300,
              background: 'radial-gradient(circle, rgba(180,85,45,0.07) 0%, transparent 70%)',
              x: smoothX,
              y: smoothY,
            }}
          />
        )}

        {/* Content layer */}
        <div className="relative z-[2]">
          <ContainerScroll
            titleComponent={
              <div className="flex flex-col items-center text-center pt-24 md:pt-10">
                {/* Eyebrow */}
                <motion.div {...heroStagger(0)}>
                  <SectionLabel className="mb-5 mx-auto">Custom Furniture</SectionLabel>
                </motion.div>

                {/* Headline */}
                <motion.h1
                  className="font-serif font-semibold text-navy"
                  style={{
                    fontSize: 'clamp(2.2rem, 5.2vw, 4.2rem)',
                    letterSpacing: '-0.035em',
                    lineHeight: 1.05,
                  }}
                  {...heroStagger(0.12)}
                >
                  Design furniture
                  <br />
                  <motion.em
                    className="not-italic hero-accent-shimmer"
                    {...heroStagger(0.24)}
                  >
                    that tells your story
                  </motion.em>
                </motion.h1>

                {/* Body */}
                <motion.p
                  className="max-w-xl mx-auto font-sans mt-5"
                  style={{
                    fontSize: 'clamp(15px, 1.6vw, 19px)',
                    lineHeight: 1.7,
                    color: '#6B7280',
                  }}
                  {...heroStagger(0.36)}
                >
                  Describe your dream space. Our AI creates visual concepts.
                  Skilled designers bring it to life with clear pricing
                  and zero miscommunication.
                </motion.p>

                {/* CTAs */}
                <motion.div
                  className="flex flex-col sm:flex-row items-center gap-3 mt-7"
                  {...heroStagger(0.48)}
                >
                  <Link to="/auth?role=customer">
                    <Button variant="hero" size="lg" className="cta-shimmer group gap-2.5 rounded-sm">
                      Start Your Project
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                    </Button>
                  </Link>
                  <Link to="/auth?role=business">
                    <Button variant="secondary" size="lg" className="gap-2 rounded-sm">
                      Join as a Creator
                    </Button>
                  </Link>
                </motion.div>

                {/* Trust */}
                <motion.p
                  className="font-sans text-xs font-medium text-stone/60 mt-4 tracking-wide"
                  {...heroStagger(0.56)}
                >
                  Free to start &middot; No credit card required &middot; 500+ verified designers
                </motion.p>
              </div>
            }
          >
            <video
              autoPlay loop muted playsInline preload="metadata"
              className="w-full h-full object-cover"
            >
              <source src={heroVideo} type="video/mp4" />
            </video>
          </ContainerScroll>

          {/* Scroll indicator */}
          <motion.div
            className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
            initial={prefersReducedMotion ? {} : { opacity: 0 }}
            animate={prefersReducedMotion ? {} : { opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.6 }}
          >
            <span className="text-[10px] font-sans font-medium uppercase tracking-[0.2em] text-navy/40">
              Scroll
            </span>
            <div className="scroll-indicator-line w-px h-6 bg-navy/30 rounded-full" />
          </motion.div>
        </div>
      </div>

      {/* ═══ How It Works ═══ */}
      <section
        className="relative py-28 lg:py-36 overflow-hidden"
        style={{ background: 'linear-gradient(180deg, #FDFCF8 0%, #F7F2EB 50%, #FAF7F2 100%)' }}
      >
        <div className="mx-auto max-w-7xl px-6">

          {/* Section heading */}
          <AnimatedSection className="text-center mb-20 lg:mb-28">
            <SectionLabel className="mb-4 mx-auto">How DEXO Works</SectionLabel>
            <h2 className="font-serif font-semibold text-navy mt-2" style={{
              fontSize: 'clamp(1.8rem, 4vw, 3rem)',
              letterSpacing: '-0.025em',
              lineHeight: 1.12,
            }}>
              Three steps. One seamless journey.
            </h2>
            <p className="font-sans mt-4 mx-auto max-w-[480px]" style={{
              fontSize: 'clamp(14px, 1.4vw, 17px)',
              color: '#6B7280',
              lineHeight: 1.6,
            }}>
              Design with AI &middot; Connect with skilled designers &middot; Transform your space
            </p>
          </AnimatedSection>

          {/* Step cards */}
          <div className="space-y-20 lg:space-y-28">
            {journeySteps.map((step, i) => (
              <div
                key={i}
                className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center"
                style={{ direction: i % 2 === 1 ? 'rtl' : 'ltr' }}
              >
                {/* Image */}
                <motion.div
                  className="relative"
                  style={{ direction: 'ltr' }}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-80px' }}
                  transition={{ duration: 0.8, delay: i * 0.05, ease: [0.25, 0.1, 0.25, 1] }}
                >
                  <div
                    className="relative aspect-[4/3] rounded-sm overflow-hidden"
                    style={{ boxShadow: '0 16px 48px rgba(25,16,8,0.10), 0 6px 16px rgba(25,16,8,0.05)' }}
                  >
                    <img
                      src={step.image}
                      alt={step.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 ring-1 ring-inset ring-black/[0.04] rounded-sm" />
                    <div
                      className="absolute top-4 left-4 px-3 py-1.5 rounded-sm text-xs font-sans font-medium flex items-center gap-1.5"
                      style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)', color: '#B4552D' }}
                    >
                      <Sparkles className="w-3 h-3" />
                      {step.accent}
                    </div>
                  </div>
                  {/* Large editorial number */}
                  <span
                    className="absolute -top-6 -left-4 pointer-events-none select-none font-serif font-bold text-terracotta/5"
                    style={{ fontSize: '6rem', lineHeight: 1 }}
                  >
                    {i + 1}
                  </span>
                </motion.div>

                {/* Text */}
                <motion.div
                  className="space-y-5"
                  style={{ direction: 'ltr' }}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-80px' }}
                  transition={{ duration: 0.8, delay: 0.1 + i * 0.05, ease: [0.25, 0.1, 0.25, 1] }}
                >
                  <SectionLabel>{step.label}</SectionLabel>
                  <h3 className="font-serif font-medium text-navy" style={{
                    fontSize: 'clamp(1.5rem, 2.8vw, 2rem)',
                    letterSpacing: '-0.02em',
                    lineHeight: 1.2,
                  }}>
                    {step.title}
                  </h3>
                  <p className="font-sans text-stone/80 text-[15px] leading-[1.75]">
                    {step.body}
                  </p>
                  <ul className="space-y-3 pt-1">
                    {step.items.map((item, j) => (
                      <li key={j} className="flex items-start gap-3">
                        <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0 text-terracotta" />
                        <span className="font-sans text-sm leading-relaxed text-navy">{item}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <AnimatedSection className="text-center mt-16" delay={0.1}>
            <Link to="/auth?role=customer">
              <Button variant="hero" size="lg" className="group gap-2">
                Start Your Design Project
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </AnimatedSection>
        </div>
      </section>

      {/* ═══ Value Proposition (For Customers / Creators) ═══ */}
      <section className="relative py-32 overflow-hidden">
        <div className="absolute inset-0 z-0" style={{
          background: 'radial-gradient(ellipse at 25% 40%, rgba(180,85,45,0.03) 0%, transparent 50%), radial-gradient(ellipse at 75% 60%, rgba(180,85,45,0.02) 0%, transparent 50%), #FDFCF8',
        }} />

        <div className="relative z-10 mx-auto max-w-6xl px-6">
          <AnimatedSection className="text-center mb-16">
            <SectionLabel className="mb-4 mx-auto">Built for Everyone</SectionLabel>
            <h2 className="font-serif font-semibold text-navy mt-2" style={{
              fontSize: 'clamp(2rem, 4vw, 3.2rem)',
              letterSpacing: '-0.02em',
              lineHeight: 1.15,
            }}>
              Whether you design or dream
            </h2>
          </AnimatedSection>

          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                badge: 'For Customers',
                title: 'Stop searching endlessly.',
                body: 'Describe your dream space, see AI-generated design concepts, and let matched designers come to you with offers.',
                bullets: ['AI generates visual concepts for your space', 'Get multiple offers from skilled designers', 'Clear pricing and timeline upfront'],
                cta: 'Start a Project',
                link: '/auth?role=customer',
              },
              {
                badge: 'For Creators',
                title: 'Stop promoting endlessly.',
                body: 'Projects come to you with detailed briefs, realistic budgets, and clients who are ready to transform their space.',
                bullets: ['Matched projects delivered to your dashboard', 'AI-generated briefs with room details', 'Focus on your craft, not marketing'],
                cta: 'Join as a Creator',
                link: '/auth?role=business',
              },
            ].map((card, i) => (
              <div
                key={i}
                className="value-card group relative bg-white rounded-sm border border-navy/[0.05] p-10 lg:p-12 transition-all duration-500 hover:border-terracotta/30 hover:shadow-lg hover:shadow-terracotta/5"
              >
                <span className="inline-block px-3 py-1.5 rounded-sm text-xs font-sans font-medium uppercase tracking-wider mb-6 bg-terracotta/[0.06] text-terracotta">
                  {card.badge}
                </span>
                <h3 className="font-serif font-semibold text-navy mb-4" style={{
                  fontSize: '1.75rem',
                  letterSpacing: '-0.015em',
                  lineHeight: 1.2,
                }}>
                  {card.title}
                </h3>
                <p className="font-sans text-stone text-[15px] leading-[1.75] mb-6">
                  {card.body}
                </p>
                <ul className="space-y-3 mb-8">
                  {card.bullets.map((item, j) => (
                    <li key={j} className="flex items-start gap-3">
                      <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0 text-terracotta" />
                      <span className="font-sans text-navy text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
                <Link to={card.link}>
                  <Button variant={i === 0 ? 'hero' : 'secondary'} size="lg" className="group/btn gap-2">
                    {card.cta}
                    <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ Categories (For Creators) ═══ */}
      <CategoriesSection
        sectionLabel="For Designers & Creators"
        heading="Built for every interior craft"
        subheading="Whether you're a carpenter, interior designer, decorator, or lighting specialist, DEXO connects you with clients who are ready to transform their spaces."
        categories={businessCategories}
        ctaButton={{
          label: "Join as a Creator",
          to: "/auth?role=business",
          variant: "secondary",
          subtitle: "Free to join · No monthly fees · Only pay when you work",
        }}
      />

      {/* ═══ Testimonials ═══ */}
      <PremiumTestimonials />

      {/* ═══ Final CTA ═══ */}
      <section className="final-cta-section relative py-32 overflow-hidden bg-navy">
        {/* Noise texture */}
        <div className="absolute inset-0 opacity-[0.05] pointer-events-none">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <filter id="ctaNoise">
              <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="4" stitchTiles="stitch" />
              <feColorMatrix type="saturate" values="0" />
            </filter>
            <rect width="100%" height="100%" filter="url(#ctaNoise)" />
          </svg>
        </div>
        {/* Radial glow */}
        <div className="absolute pointer-events-none" style={{
          top: '15%', left: '50%', transform: 'translateX(-50%)',
          width: '600px', height: '350px',
          background: 'radial-gradient(ellipse, rgba(180,85,45,0.15), transparent 65%)',
        }} />

        <div className="final-cta-content relative z-10 mx-auto max-w-3xl px-6 text-center">
          <h2
            className="font-serif font-semibold text-cream mb-6"
            style={{
              fontSize: 'clamp(2rem, 5vw, 3.5rem)',
              letterSpacing: '-0.02em',
              lineHeight: 1.12,
            }}
          >
            Ready to transform your space?
          </h2>
          <p className="font-sans text-lg mb-10 leading-relaxed text-cream/55">
            Whether you have a clear vision or just a spark of an idea,
            DEXO helps you design your perfect interior with the right professional.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/auth?role=customer">
              <button
                className="cta-shimmer group h-13 px-8 text-[15px] font-sans font-medium rounded-sm flex items-center gap-2.5 cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:-translate-y-px"
                style={{ background: '#F8F1E8', color: '#1A2332', boxShadow: '0 4px 20px rgba(248,241,232,0.12)' }}
              >
                Start Your Project
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            </Link>
            <Link to="/auth?role=business">
              <button
                className="h-13 px-8 text-[15px] font-sans font-medium rounded-sm flex items-center gap-2 cursor-pointer transition-all duration-300 hover:bg-cream/10"
                style={{ color: '#F8F1E8', border: '1px solid rgba(248,241,232,0.18)' }}
              >
                Join as a Creator
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ Footer ═══ */}
      <footer className="py-14 border-t border-navy/10 bg-cream">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <img src={dexoLogoFull} alt="DEXO" className="h-6 w-auto" />
            <div className="flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-10 font-sans text-sm text-stone">
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-stone/60">Resources</span>
                <Link to="/blog" className="hover:text-navy transition-colors">Blog</Link>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-stone/60">Explore</span>
                <Link to="/browse-businesses" className="hover:text-navy transition-colors">Browse Designers</Link>
                <Link to="/auth?role=business" className="hover:text-navy transition-colors">Become a Creator</Link>
              </div>
            </div>
            <div className="font-sans text-sm text-stone/50">
              &copy; 2026 DEXO
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
