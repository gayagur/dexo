import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { PremiumTestimonials } from '@/components/PremiumTestimonials';
import { ValueProps } from '@/components/ValueProps';
import { HeroSection } from '@/components/landing/HeroSection';
import { StepsSection } from '@/components/landing/StepsSection';
import { CategoriesSection } from '@/components/landing/CategoriesSection';
import { FinalCTA } from '@/components/landing/FinalCTA';

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

export const businessCategories = [
  {
    image: categoryJewelry,
    title: "Jewelry & Goldsmiths",
    filterValue: "Jewelry",
    example: "Custom engagement rings, personalized necklaces",
    benefit: "Receive detailed design specs with exact measurements and style references",
  },
  {
    image: categoryCakes,
    title: "Custom Cake Creators",
    filterValue: "Custom Cakes",
    example: "Wedding cakes, themed birthday creations",
    benefit: "Get clear visual briefs with flavor preferences and event details upfront",
  },
  {
    image: categoryFurniture,
    title: "Furniture & Woodworkers",
    filterValue: "Furniture",
    example: "Bespoke tables, custom shelving units",
    benefit: "Clients arrive with dimensions, material choices, and budget ready",
  },
  {
    image: categoryFashion,
    title: "Fashion & Tailors",
    filterValue: "Clothing",
    example: "Custom suits, redesigned vintage pieces",
    benefit: "Fewer revision rounds with AI-generated style mockups",
  },
  {
    image: categoryCeramics,
    title: "Ceramic Artists",
    filterValue: "Pottery",
    example: "Custom dinnerware sets, sculptural pieces",
    benefit: "Matched with clients who value handmade artistry",
  },
  {
    image: categoryGifts,
    title: "Personalized Gift Studios",
    filterValue: "Accessories",
    example: "Engraved items, custom packaging",
    benefit: "Receive ready-to-produce briefs with personalization details",
  },
  {
    image: categoryTextiles,
    title: "Textile & Embroidery",
    filterValue: "Textiles",
    example: "Custom quilts, monogrammed linens",
    benefit: "Visual references and color palettes provided upfront",
  },
  {
    image: category3dprint,
    title: "3D Printing & Prototyping",
    filterValue: "3D Printing",
    example: "Custom figurines, product prototypes",
    benefit: "Get AI-assisted 3D concepts before production starts",
  },
];

export const landingSteps = [
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

const LandingPage = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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

      <HeroSection
        titleLine="From idea to reality,"
        accentWord="together"
        subtitle="Design your vision with AI. Connect with skilled creators. Receive your custom-made product — jewelry, furniture, cakes, fashion, and more."
        primaryCta={{ label: "Start Your Project", to: "/auth?role=customer" }}
        secondaryCta={{ label: "Join as a Creator", to: "/auth?role=business" }}
      />

      <StepsSection
        sectionLabel="How DEXO Works"
        heading="Three steps. One seamless journey."
        subheading="Design with AI • Connect with skilled makers • Receive your custom product"
        steps={landingSteps}
        ctaButton={{ label: "Start Your Custom Project", to: "/auth?role=customer" }}
      />

      <CategoriesSection
        sectionLabel="For Creators & Makers"
        heading="Built for every craft"
        subheading="Whether you're a jeweler, baker, woodworker, or fashion designer — DEXO connects you with clients who are ready to buy, with clear briefs and realistic budgets."
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
        heading="Ready to create something unique?"
        subheading="Whether you have a clear vision or just a spark of an idea, DEXO helps you bring it to life with the right creator."
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
