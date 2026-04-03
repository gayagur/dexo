import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { PremiumTestimonials } from '@/components/PremiumTestimonials';
import { ValueProps } from '@/components/ValueProps';
import { StepsSection } from '@/components/landing/StepsSection';
import { CategoriesSection } from '@/components/landing/CategoriesSection';
import { FinalCTA } from '@/components/landing/FinalCTA';
import { CinematicHero } from '@/components/landing/CinematicHero';
import { useLenis } from '@/hooks/useLenis';

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

export const businessCategories = [
  {
    image: categoryCarpentry,
    title: "Carpentry & Woodworking",
    filterValue: "Carpentry & Woodworking",
    example: "Custom shelving, built-in cabinetry, wood paneling",
    benefit: "Clients arrive with room dimensions, material preferences, and budget ready",
  },
  {
    image: categoryDecor,
    title: "Home Decor & Styling",
    filterValue: "Home Decor & Styling",
    example: "Room styling, accessory curation, seasonal decor",
    benefit: "Receive visual briefs with style preferences and color palettes upfront",
  },
  {
    image: categoryInterior,
    title: "Interior Design & Space Planning",
    filterValue: "Interior Design & Space Planning",
    example: "Full room redesigns, open-plan layouts, renovations",
    benefit: "Get detailed room briefs with measurements, style direction, and realistic budgets",
  },
  {
    image: categoryLighting,
    title: "Lighting & Ambiance",
    filterValue: "Lighting & Ambiance",
    example: "Lighting plans, custom fixtures, mood lighting",
    benefit: "Matched with homeowners who need complete lighting solutions",
  },
  {
    image: categoryWallart,
    title: "Wall Art & Accessories",
    filterValue: "Wall Art & Decorative Accessories",
    example: "Gallery walls, custom art, decorative mirrors",
    benefit: "AI-generated visual concepts help clients see possibilities before committing",
  },
  {
    image: categoryFurniture,
    title: "Furniture Design & Restoration",
    filterValue: "Furniture Design & Restoration",
    example: "Custom tables, chair restoration, bespoke sofas",
    benefit: "Clients arrive with style, dimensions, and material preferences defined",
  },
  {
    image: categoryTextiles,
    title: "Textiles & Soft Furnishings",
    filterValue: "Textiles & Soft Furnishings",
    example: "Custom curtains, upholstery, rugs, cushions",
    benefit: "Visual references and fabric preferences provided upfront",
  },
  {
    image: categoryPlants,
    title: "Plants & Greenery Styling",
    filterValue: "Plants & Greenery Styling",
    example: "Indoor gardens, plant arrangements, green walls",
    benefit: "Briefs include room lighting, space, and care preferences",
  },
  {
    image: categoryStorage,
    title: "Storage & Organization",
    filterValue: "Storage & Organization Solutions",
    example: "Closet systems, pantry organization, shelving",
    benefit: "Receive ready-to-build briefs with space measurements and requirements",
  },
  {
    image: categoryOffice,
    title: "Office Design & Ergonomics",
    filterValue: "Office Design & Ergonomics",
    example: "Home office setups, ergonomic workspaces, team offices",
    benefit: "Workspace projects come with ergonomic needs and productivity goals",
  },
];

export const landingSteps = [
  {
    image: stepDesign,
    alt: "Customer describing their dream room with AI assistant",
    number: 1,
    title: "Design",
    badge: "AI-Powered",
    description: 'Describe your space and style. Our AI generates <strong>visual design concepts</strong> for your room — living room, bedroom, office, or any space.',
    items: [
      "You describe your space and style preferences",
      "<strong>AI generates visual design concepts</strong> for your room",
      "Refine until it matches your vision",
    ],
    footer: { title: "You + AI", sub: "Turn ideas into visual room designs before any work begins" },
  },
  {
    image: stepConnect,
    alt: "Interior designer reviewing a room design brief",
    number: 2,
    title: "Connect",
    priceBadges: ["$4,500", "6 weeks"],
    description: 'Matched designers review your brief. They see your AI design concept and submit offers with <strong>pricing, timeline, and their approach</strong>.',
    items: [
      "Designers see your visual concept + room details",
      "They submit <strong>price + timeline offers</strong>",
      "You choose who to work with",
    ],
    footer: { title: "Skilled Designers", sub: "Real professionals ready to transform your space" },
  },
  {
    image: stepTransform,
    alt: "Beautiful transformed living room interior",
    number: 3,
    title: "Transform",
    ratingBadge: "★ 5.0 Perfect",
    description: 'Your space is transformed — <strong>exactly as you envisioned</strong>. No endless searching, no miscommunication.',
    items: [
      "Your designer brings the vision to life",
      "Track progress with updates",
      "<strong>Enjoy your transformed space</strong>",
    ],
    footer: { title: "Happy You", sub: "Beautiful spaces designed just for you" },
  },
];

const LandingPage = () => {
  const [scrolled, setScrolled] = useState(false);

  // Smooth scroll — only active on landing page, cleaned up on unmount
  useLenis();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background">
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
            {
              "@type": "WebSite",
              "name": "DEXO",
              "url": "https://dexo.info",
              "description": "AI-Powered Interior Design Marketplace"
            },
            {
              "@type": "Organization",
              "name": "DEXO",
              "url": "https://dexo.info",
              "logo": "https://dexo.info/og-default.png",
              "description": "Design your dream space with AI. Connect with skilled interior designers, carpenters, and decorators.",
              "sameAs": []
            }
          ]
        }) }} />
      </Helmet>
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

      <CinematicHero
        titleLine="From idea to reality,"
        accentWord="together"
        subtitle="Design your dream interior with AI. Connect with skilled designers, carpenters, and decorators. Transform any room in your home or office."
        primaryCta={{ label: "Start Your Project", to: "/auth?role=customer" }}
        secondaryCta={{ label: "Join as a Creator", to: "/auth?role=business" }}
      />

      <StepsSection
        sectionLabel="How DEXO Works"
        heading="Three steps. One seamless journey."
        subheading="Design with AI • Connect with skilled designers • Transform your space"
        steps={landingSteps}
        ctaButton={{ label: "Start Your Design Project", to: "/auth?role=customer" }}
      />

      <CategoriesSection
        sectionLabel="For Designers & Creators"
        heading="Built for every interior craft"
        subheading="Whether you're a carpenter, interior designer, decorator, or lighting specialist — DEXO connects you with clients who are ready to transform their spaces, with clear briefs and realistic budgets."
        categories={businessCategories}
        ctaButton={{
          label: "Join as a Creator",
          to: "/auth?role=business",
          variant: "warm",
          subtitle: "Free to join • No monthly fees • Only pay when you work",
        }}
      />

      <ValueProps />

      <PremiumTestimonials />

      <FinalCTA
        heading="Ready to transform your space?"
        subheading="Whether you have a clear vision or just a spark of an idea, DEXO helps you design your perfect interior with the right professional."
        primaryCta={{ label: "Start Your Project", to: "/auth?role=customer" }}
        secondaryCta={{ label: "Join as a Creator", to: "/auth?role=business" }}
      />

      {/* Footer */}
      <footer className="py-12 border-t border-border">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-serif font-semibold text-primary">DEXO</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-10 text-sm text-muted-foreground">
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-foreground/45">Resources</span>
                <Link to="/blog" className="hover:text-foreground transition-colors">Blog</Link>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-foreground/45">Explore</span>
                <Link to="/browse-businesses" className="hover:text-foreground transition-colors">Browse Designers</Link>
                <Link to="/auth?role=business" className="hover:text-foreground transition-colors">Become a Creator</Link>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              © 2026 DEXO. Designed with care.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
