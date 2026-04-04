import { useState, useEffect, useRef, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';
import { PremiumTestimonials } from '@/components/PremiumTestimonials';
import { CategoriesSection } from '@/components/landing/CategoriesSection';
import { ContainerScroll } from '@/components/ui/container-scroll';
import { useLenis } from '@/hooks/useLenis';
import { WovenBackground } from '@/components/landing/WovenBackground';
import AOS from 'aos';
import 'aos/dist/aos.css';
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

/* ═══════════════════════════════════════════════════════════════
   DATA
   ═══════════════════════════════════════════════════════════════ */

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

/* ═════════════════════════════════════════════════════════════���═
   COMPONENT
   ═══════════════════════════════════════════════════════════════ */

/** Split text into individual character spans for staggered animation */
function SplitChars({ text, className }: { text: string; className?: string }) {
  return (
    <>
      {text.split('').map((char, i) => (
        <span
          key={i}
          className={`title-char inline-block ${className ?? ''}`}
          style={{ display: char === ' ' ? 'inline' : 'inline-block' }}
        >
          {char === ' ' ? '\u00A0' : char}
        </span>
      ))}
    </>
  );
}

const LandingPage = () => {
  const [scrolled, setScrolled] = useState(false);
  const mainRef = useRef<HTMLDivElement>(null);

  const heroVideo = useMemo(() => {
    const videos = ['/dexo.mp4', '/dexo2.mp4', '/dexo3.mp4', '/dexo4.mp4'];
    return videos[Math.floor(Math.random() * videos.length)];
  }, []);

  useLenis();

  useEffect(() => {
    AOS.init({ duration: 800, easing: 'ease-out-cubic', once: true, offset: 80 });
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* ── GSAP — remaining sections (value cards, final CTA) ── */
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
    <div ref={mainRef} className="bg-[#FDFCF8]">
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

      {/* ═══ Navigation ═══ */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled ? 'bg-[#FDFCF8]/85 backdrop-blur-xl border-b border-[#E0D5CC]/40' : 'bg-transparent'
      }`}>
        <div className="mx-auto max-w-7xl px-6 h-20 flex items-center justify-between">
          <Link to="/">
            <span
              className="text-2xl font-semibold"
              style={{ fontFamily: "'Instrument Serif', 'Playfair Display', serif", color: '#C05621' }}
            >
              DEXO
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/auth">
              <Button variant="ghost" size="default" className="text-[#1B2432]/70 hover:text-[#1B2432]">Sign in</Button>
            </Link>
            <Link to="/auth">
              <Button size="default" className="rounded-xl">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ═══════════════════════════════════════════════════════
           SECTION 1 — HERO
           ContainerScroll: 3D perspective card with scroll
           ═══════════════════════════════════════════════════════ */}
      <div className="relative overflow-hidden" style={{ background: '#F7F3EF' }}>
        {/* Ambient radials */}
        <div className="absolute top-[10%] right-[12%] w-[500px] h-[500px] rounded-full pointer-events-none opacity-25" style={{
          background: 'radial-gradient(circle, rgba(201,106,61,0.07), transparent 65%)',
        }} />
        <div className="absolute bottom-[15%] left-[5%] w-[400px] h-[400px] rounded-full pointer-events-none opacity-20" style={{
          background: 'radial-gradient(circle, rgba(201,169,110,0.06), transparent 65%)',
        }} />

        {/* Woven light particle background */}
        <WovenBackground />

        <ContainerScroll
          titleComponent={
            <div className="flex flex-col items-center text-center pt-24 md:pt-10">
              {/* Eyebrow */}
              <p
                style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: '13px',
                  fontWeight: 500,
                  letterSpacing: '0.2em',
                  lineHeight: 1,
                  textTransform: 'uppercase' as const,
                  color: '#C9845F',
                  marginBottom: '20px',
                }}
              >
                AI-Powered Interior Design
              </p>

              {/* Headline */}
              <h1
                style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: 'clamp(36px, 5.2vw, 68px)',
                  fontWeight: 500,
                  letterSpacing: '-0.035em',
                  lineHeight: 1.05,
                  color: '#1F2940',
                }}
              >
                From idea to reality,
                <br />
                <span
                  className="hero-accent-shimmer"
                  style={{
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontWeight: 600,
                    letterSpacing: '-0.04em',
                    color: '#C9845F',
                  }}
                >
                  together.
                </span>
              </h1>

              {/* Body */}
              <p
                className="max-w-xl mx-auto"
                style={{
                  fontFamily: "'Sanchez', serif",
                  fontSize: 'clamp(16px, 1.8vw, 22px)',
                  fontWeight: 400,
                  lineHeight: 1.7,
                  color: '#6B7280',
                  marginTop: '20px',
                }}
              >
                Describe your dream space. Our AI creates visual concepts.
                Skilled designers bring it to life with clear pricing
                and zero miscommunication.
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-center gap-3 mt-7">
                <Link to="/auth?role=customer">
                  <button
                    className="cta-shimmer group flex items-center gap-2.5 cursor-pointer transition-all duration-300 hover:scale-[1.02]"
                    style={{
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      fontSize: '17px',
                      fontWeight: 600,
                      letterSpacing: '-0.01em',
                      height: '54px',
                      padding: '0 26px',
                      borderRadius: '18px',
                      background: '#C96A3D',
                      color: 'white',
                      boxShadow: '0 10px 30px rgba(201, 106, 61, 0.22)',
                    }}
                  >
                    Start Your Project
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                  </button>
                </Link>
                <Link to="/auth?role=business">
                  <button
                    className="group flex items-center gap-2 cursor-pointer transition-all duration-300 hover:bg-white/90"
                    style={{
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      fontSize: '17px',
                      fontWeight: 600,
                      letterSpacing: '-0.01em',
                      height: '54px',
                      padding: '0 26px',
                      borderRadius: '18px',
                      color: '#1F2940',
                      border: '1px solid rgba(31, 41, 64, 0.12)',
                      background: 'rgba(255,255,255,0.72)',
                      backdropFilter: 'blur(8px)',
                    }}
                  >
                    Join as a Creator
                  </button>
                </Link>
              </div>

              {/* Trust */}
              <p style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: '12px',
                fontWeight: 500,
                letterSpacing: '0.04em',
                color: '#9CA3AF',
                marginTop: '14px',
              }}>
                Free to start · No credit card required · 500+ verified designers
              </p>
            </div>
          }
        >
          {/* Video inside the 3D perspective card */}
          <video
            autoPlay loop muted playsInline preload="metadata"
            className="w-full h-full object-cover"
          >
            <source src={heroVideo} type="video/mp4" />
          </video>
        </ContainerScroll>
      </div>

      {/* ═══════════════════════════════════════════════════════
           SECTION 2 — JOURNEY (How it works)
           AOS fade-up reveals on each step
           ═══════════════════════════════════════════════════════ */}
      <section className="relative py-28 lg:py-36 overflow-hidden" style={{
        background: 'linear-gradient(180deg, #FDFCF8 0%, #F7F2EB 50%, #FAF7F2 100%)',
      }}>
        <div className="mx-auto max-w-7xl px-6">

          {/* Section heading */}
          <div className="text-center mb-20 lg:mb-28" data-aos="fade-up">
            <p style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: '13px',
              fontWeight: 500,
              letterSpacing: '0.2em',
              textTransform: 'uppercase' as const,
              color: '#C9845F',
              marginBottom: '16px',
            }}>
              How DEXO Works
            </p>
            <h2 style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: 'clamp(1.8rem, 4vw, 3rem)',
              fontWeight: 500,
              letterSpacing: '-0.025em',
              lineHeight: 1.12,
              color: '#1F2940',
              marginBottom: '16px',
            }}>
              Three steps. One seamless journey.
            </h2>
            <p style={{
              fontFamily: "'Sanchez', serif",
              fontSize: 'clamp(15px, 1.5vw, 18px)',
              color: '#6B7280',
              lineHeight: 1.6,
              maxWidth: '480px',
              margin: '0 auto',
            }}>
              Design with AI · Connect with skilled designers · Transform your space
            </p>
          </div>

          {/* Step cards */}
          <div className="space-y-20 lg:space-y-28">
            {journeySteps.map((step, i) => (
              <div
                key={i}
                className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center"
                style={{ direction: i % 2 === 1 ? 'rtl' : 'ltr' }}
              >
                {/* Image */}
                <div
                  className="relative"
                  style={{ direction: 'ltr' }}
                  data-aos="fade-up"
                  data-aos-delay={i * 50}
                >
                  <div
                    className="relative aspect-[4/3] rounded-2xl overflow-hidden"
                    style={{
                      boxShadow: '0 16px 48px rgba(25,16,8,0.10), 0 6px 16px rgba(25,16,8,0.05)',
                    }}
                  >
                    <img src={step.image} alt={step.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 ring-1 ring-inset ring-black/[0.04] rounded-2xl" />
                    <div
                      className="absolute top-4 left-4 px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5"
                      style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)', color: '#C9845F' }}
                    >
                      <Sparkles className="w-3 h-3" />
                      {step.accent}
                    </div>
                  </div>
                  {/* Large editorial number */}
                  <span
                    className="absolute -top-6 -left-4 pointer-events-none select-none"
                    style={{
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      fontSize: '6rem',
                      fontWeight: 700,
                      opacity: 0.04,
                      color: '#C9845F',
                      lineHeight: 1,
                    }}
                  >
                    {i + 1}
                  </span>
                </div>

                {/* Text */}
                <div
                  className="space-y-5"
                  style={{ direction: 'ltr' }}
                  data-aos="fade-up"
                  data-aos-delay={100 + i * 50}
                >
                  <p style={{
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontSize: '12px',
                    fontWeight: 500,
                    letterSpacing: '0.2em',
                    textTransform: 'uppercase' as const,
                    color: '#C9845F',
                  }}>
                    {step.label}
                  </p>
                  <h3 style={{
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontSize: 'clamp(1.5rem, 2.8vw, 2rem)',
                    fontWeight: 500,
                    letterSpacing: '-0.02em',
                    lineHeight: 1.2,
                    color: '#1F2940',
                  }}>
                    {step.title}
                  </h3>
                  <p style={{
                    fontFamily: "'Sanchez', serif",
                    fontSize: '15px',
                    lineHeight: 1.75,
                    color: '#6B7280',
                  }}>
                    {step.body}
                  </p>
                  <ul className="space-y-3 pt-1">
                    {step.items.map((item, j) => (
                      <li key={j} className="flex items-start gap-3">
                        <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#C9845F' }} />
                        <span className="text-sm leading-relaxed" style={{ color: '#1F2940' }}>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="text-center mt-16" data-aos="fade-up">
            <Link to="/auth?role=customer">
              <Button variant="hero" size="lg" className="group rounded-xl">
                Start Your Design Project
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
           SECTION 3 — VALUE PROPOSITION (For Customers / Creators)
           ═══════════════════════════════════════════════════════ */}
      <section className="relative py-32 overflow-hidden">
        <div className="absolute inset-0 z-0" style={{
          background: `
            radial-gradient(ellipse at 25% 40%, rgba(192,86,33,0.03) 0%, transparent 50%),
            radial-gradient(ellipse at 75% 60%, rgba(192,86,33,0.02) 0%, transparent 50%),
            #FDFCF8
          `,
        }} />

        <div className="relative z-10 mx-auto max-w-6xl px-6">
          <div className="scroll-reveal text-center mb-16" data-reveal>
            <p className="text-xs font-medium uppercase tracking-[0.25em] mb-4" style={{ color: '#C05621' }}>
              Built for Everyone
            </p>
            <h2
              style={{
                fontFamily: "'Instrument Serif', 'Playfair Display', serif",
                fontSize: 'clamp(2rem, 4vw, 3.2rem)',
                fontWeight: 400,
                letterSpacing: '-0.02em',
                lineHeight: 1.15,
                color: '#1B2432',
              }}
            >
              Whether you design or dream
            </h2>
          </div>

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
                className="value-card scroll-reveal group relative rounded-2xl p-10 lg:p-12 transition-shadow duration-500"
                style={{
                  background: 'white',
                  border: '1px solid rgba(0,0,0,0.05)',
                  boxShadow: '0 2px 16px rgba(25,16,8,0.04)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 12px 40px rgba(192,86,33,0.08)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 2px 16px rgba(25,16,8,0.04)'; }}
              >
                <span
                  className="inline-block px-3 py-1.5 rounded-full text-xs font-medium uppercase tracking-wider mb-6"
                  style={{ background: 'rgba(192,86,33,0.06)', color: '#C05621' }}
                >
                  {card.badge}
                </span>
                <h3
                  className="mb-4"
                  style={{
                    fontFamily: "'Instrument Serif', 'Playfair Display', serif",
                    fontSize: '1.75rem',
                    fontWeight: 400,
                    color: '#1B2432',
                    letterSpacing: '-0.015em',
                    lineHeight: 1.2,
                  }}
                >
                  {card.title}
                </h3>
                <p className="text-[#4A5568] text-[15px] leading-[1.75] mb-6">
                  {card.body}
                </p>
                <ul className="space-y-3 mb-8">
                  {card.bullets.map((item, j) => (
                    <li key={j} className="flex items-start gap-3">
                      <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#C05621' }} />
                      <span className="text-[#1B2432] text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
                <Link to={card.link}>
                  <Button variant={i === 0 ? 'hero' : 'warm'} size="lg" className="group/btn rounded-xl">
                    <span className="flex items-center gap-2">
                      {card.cta}
                      <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
                    </span>
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
           SECTION 5 — CATEGORIES (For Creators)
           ═══════════════════════════════════════════════════════ */}
      <CategoriesSection
        sectionLabel="For Designers & Creators"
        heading="Built for every interior craft"
        subheading="Whether you're a carpenter, interior designer, decorator, or lighting specialist, DEXO connects you with clients who are ready to transform their spaces."
        categories={businessCategories}
        ctaButton={{
          label: "Join as a Creator",
          to: "/auth?role=business",
          variant: "warm",
          subtitle: "Free to join · No monthly fees · Only pay when you work",
        }}
      />

      {/* ═══════════════════════════════════════════════════════
           SECTION 6 — TESTIMONIALS
           ═══════════════════════════════════════════════════════ */}
      <PremiumTestimonials />

      {/* ═══════════════════════════════════════════════════════
           SECTION 7 — FINAL CTA
           Dark warm background, cinematic
           ═══════════════════════════════════════════════════════ */}
      <section className="final-cta-section relative py-32 overflow-hidden" style={{ background: '#1A1008' }}>
        {/* Noise texture */}
        <div className="absolute inset-0 opacity-[0.05] pointer-events-none">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <filter id="ctaNoise"><feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="4" stitchTiles="stitch" /><feColorMatrix type="saturate" values="0" /></filter>
            <rect width="100%" height="100%" filter="url(#ctaNoise)" />
          </svg>
        </div>
        {/* Radial glow */}
        <div className="absolute pointer-events-none" style={{
          top: '15%', left: '50%', transform: 'translateX(-50%)',
          width: '600px', height: '350px',
          background: 'radial-gradient(ellipse, rgba(192,86,33,0.12), transparent 65%)',
        }} />

        <div className="final-cta-content relative z-10 mx-auto max-w-3xl px-6 text-center">
          <h2
            className="mb-6"
            style={{
              fontFamily: "'Instrument Serif', 'Playfair Display', serif",
              fontSize: 'clamp(2rem, 5vw, 3.5rem)',
              fontWeight: 400,
              letterSpacing: '-0.02em',
              lineHeight: 1.12,
              color: '#FFF5EB',
            }}
          >
            Ready to transform your space?
          </h2>
          <p className="text-lg mb-10 leading-relaxed" style={{ color: 'rgba(255,245,235,0.55)' }}>
            Whether you have a clear vision or just a spark of an idea,
            DEXO helps you design your perfect interior with the right professional.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/auth?role=customer">
              <button className="cta-shimmer group h-13 px-8 text-[15px] rounded-xl font-medium flex items-center gap-2.5 cursor-pointer transition-all duration-300 hover:scale-[1.02]" style={{
                background: '#FFF5EB', color: '#1A1008',
                boxShadow: '0 4px 20px rgba(255,245,235,0.12)',
              }}>
                Start Your Project
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            </Link>
            <Link to="/auth?role=business">
              <button className="h-13 px-8 text-[15px] rounded-xl font-medium flex items-center gap-2 cursor-pointer transition-all duration-300 hover:bg-white/10" style={{
                color: '#FFF5EB', border: '1px solid rgba(255,245,235,0.18)',
              }}>
                Join as a Creator
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ Footer ═══ */}
      <footer className="py-14 border-t border-[#E0D5CC]/50" style={{ background: '#FDFCF8' }}>
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <span
              className="text-xl font-semibold"
              style={{ fontFamily: "'Instrument Serif', 'Playfair Display', serif", color: '#C05621' }}
            >
              DEXO
            </span>
            <div className="flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-10 text-sm" style={{ color: '#7A746D' }}>
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-medium uppercase tracking-[0.2em]" style={{ color: '#B0A89F' }}>Resources</span>
                <Link to="/blog" className="hover:text-[#1B2432] transition-colors">Blog</Link>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-medium uppercase tracking-[0.2em]" style={{ color: '#B0A89F' }}>Explore</span>
                <Link to="/browse-businesses" className="hover:text-[#1B2432] transition-colors">Browse Designers</Link>
                <Link to="/auth?role=business" className="hover:text-[#1B2432] transition-colors">Become a Creator</Link>
              </div>
            </div>
            <div className="text-sm" style={{ color: '#B0A89F' }}>
              © 2026 DEXO
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
