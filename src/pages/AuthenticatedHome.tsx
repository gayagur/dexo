import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/app/AppLayout';
import { HeroSection } from '@/components/landing/HeroSection';
import { StepsSection } from '@/components/landing/StepsSection';
import type { StepData } from '@/components/landing/StepsSection';
import { CategoriesSection } from '@/components/landing/CategoriesSection';
import { FinalCTA } from '@/components/landing/FinalCTA';
import { ValueCard, cards as valueCards } from '@/components/ValueProps';
import { useAuth } from '@/hooks/useAuth';
import { useProjects } from '@/hooks/useProjects';
import { useMatchedProjects } from '@/hooks/useMatchedProjects';
import { useBusinessProfile } from '@/hooks/useBusinessProfile';
import { useBusinessOffers } from '@/hooks/useOffers';
import { businessCategories } from '@/pages/LandingPage';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles, FolderOpen, Send, MessageSquare, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { fadeUp } from '@/components/landing/HeroSection';

// Step images (same as landing page)
import stepDesign from '@/assets/step-design.jpg';
import stepCreate from '@/assets/step-create.jpg';
import stepReceive from '@/assets/step-receive.jpg';

// ── Role-specific step content ──────────────────────────────
const customerSteps: StepData[] = [
  {
    image: stepDesign,
    alt: "Describe your product idea",
    number: 1,
    title: "Describe",
    badge: "AI-Powered",
    description: "Tell us about your custom product. Our AI helps you create a <strong>detailed brief with visual concepts</strong>.",
    items: [
      "Describe your idea in your own words",
      "<strong>AI generates visual mockups</strong> of your product",
      "Refine until it matches your vision",
    ],
    footer: { title: "You + AI", sub: "Turn ideas into visual designs before production" },
  },
  {
    image: stepCreate,
    alt: "Receive offers from creators",
    number: 2,
    title: "Receive Offers",
    priceBadges: ["$2,400", "3 weeks"],
    description: "Matched creators review your brief and send you offers with <strong>pricing, timeline, and approach</strong>.",
    items: [
      "Creators see your visual design + details",
      "They submit <strong>price + timeline offers</strong>",
      "Compare and choose your favorite",
    ],
    footer: { title: "Real Creators", sub: "Verified artisans ready to bring your design to life" },
  },
  {
    image: stepReceive,
    alt: "Collaborate with your creator",
    number: 3,
    title: "Choose & Collaborate",
    ratingBadge: "★ 5.0 Perfect",
    description: "Pick your favorite creator, chat directly, and <strong>watch your idea come to life</strong>.",
    items: [
      "Chat directly with your chosen creator",
      "Track progress with updates",
      "<strong>Receive your finished product</strong>",
    ],
    footer: { title: "Happy You", sub: "One-of-a-kind products made just for you" },
  },
];

const creatorSteps: StepData[] = [
  {
    image: stepDesign,
    alt: "Discover matched projects",
    number: 1,
    title: "Discover",
    badge: "Auto-Matched",
    description: "Projects matching your craft are delivered to your dashboard. Complete briefs with <strong>budgets and AI-generated visuals</strong>.",
    items: [
      "New projects appear on your dashboard",
      "<strong>AI-generated visual briefs</strong> included",
      "Budget and timeline shown upfront",
    ],
    footer: { title: "Smart Matching", sub: "Only projects that fit your craft and skills" },
  },
  {
    image: stepCreate,
    alt: "Send an offer to the client",
    number: 2,
    title: "Send an Offer",
    priceBadges: ["Your Price", "Your Timeline"],
    description: "Review the brief, see the client's budget, and submit your offer with <strong>pricing and timeline</strong>.",
    items: [
      "Review the complete project brief",
      "Set <strong>your own price and timeline</strong>",
      "Submit your offer with one click",
    ],
    footer: { title: "You're in Control", sub: "Set your own terms and pricing" },
  },
  {
    image: stepReceive,
    alt: "Deliver and earn",
    number: 3,
    title: "Deliver & Earn",
    ratingBadge: "★ Top Rated",
    description: "Work directly with the client, deliver your craft, and <strong>build your reputation</strong>.",
    items: [
      "Chat directly with your client",
      "Deliver your one-of-a-kind creation",
      "<strong>Earn and grow your reputation</strong>",
    ],
    footer: { title: "Your Brand", sub: "Every delivery builds your creator profile" },
  },
];

// ── Status badge colors ─────────────────────────────────────
const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  sent: 'bg-blue-100 text-blue-700',
  offers_received: 'bg-amber-100 text-amber-700',
  in_progress: 'bg-green-100 text-green-700',
  completed: 'bg-primary/10 text-primary',
};

const statusLabels: Record<string, string> = {
  draft: 'Draft',
  sent: 'Sent',
  offers_received: 'Offers Received',
  in_progress: 'In Progress',
  completed: 'Completed',
};

// ── Main Page Component ─────────────────────────────────────
const AuthenticatedHome = () => {
  const { user, role } = useAuth();
  const firstName = user?.user_metadata?.name?.split(' ')[0]
    || user?.user_metadata?.full_name?.split(' ')[0]
    || 'there';

  const isCreator = role === 'business';

  return (
    <AppLayout>
      <HeroSection
        titleLine={`Welcome back, ${firstName}`}
        accentWord={isCreator ? "Turn requests into business." : "Bring your idea to life."}
        subtitle={
          isCreator
            ? "Discover new projects and grow your creative brand."
            : "Post your custom request and receive offers from talented creators."
        }
        primaryCta={
          isCreator
            ? { label: "Browse Open Projects", to: "/business" }
            : { label: "Start a New Project", to: "/create-project" }
        }
        secondaryCta={
          isCreator
            ? { label: "Edit Your Profile", to: "/profile" }
            : { label: "Browse Creators", to: "/browse-businesses" }
        }
        pathCount={12}
        fullScreen={false}
      />

      <StepsSection
        sectionLabel={isCreator ? "How It Works for Creators" : "How It Works"}
        heading={isCreator ? "Three steps to grow your business." : "Three steps. One seamless journey."}
        subheading={
          isCreator
            ? "Discover projects • Send offers • Deliver & earn"
            : "Describe your vision • Receive offers • Collaborate with your creator"
        }
        steps={isCreator ? creatorSteps : customerSteps}
      />

      <CategoriesSection
        sectionLabel={isCreator ? "Your Marketplace" : "Explore Categories"}
        heading={isCreator ? "Your marketplace" : "Explore categories"}
        subheading={
          isCreator
            ? "Clients across all these crafts are looking for creators like you."
            : "Find the perfect creator for your next project."
        }
        categories={businessCategories}
      />

      {/* Role-specific Value Prop Card */}
      <section
        className="relative py-20 overflow-hidden"
        style={{
          background: `
            radial-gradient(ellipse at 25% 40%, rgba(192,86,33,0.04) 0%, transparent 50%),
            radial-gradient(ellipse at 75% 60%, rgba(192,86,33,0.03) 0%, transparent 50%),
            #FDFCF8
          `,
        }}
      >
        <div className="container mx-auto px-6">
          <motion.div
            className="max-w-xl mx-auto"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
          >
            <ValueCard card={isCreator ? valueCards[1] : valueCards[0]} />
          </motion.div>
        </div>
      </section>

      {/* Recent Activity */}
      {isCreator ? <CreatorActivity /> : <CustomerActivity />}

      <FinalCTA
        heading={isCreator ? "Ready to grow your business?" : "Ready to create something unique?"}
        subheading={
          isCreator
            ? "New projects are posted every day. Don't miss your next opportunity."
            : "Whether you have a clear vision or just a spark of an idea, DEXO helps you bring it to life."
        }
        primaryCta={
          isCreator
            ? { label: "Browse Projects", to: "/business" }
            : { label: "Start Your Project", to: "/create-project" }
        }
        secondaryCta={
          isCreator
            ? { label: "Edit Profile", to: "/profile" }
            : { label: "Browse Creators", to: "/browse-businesses" }
        }
      />
    </AppLayout>
  );
};

// ── Customer Recent Activity ────────────────────────────────
function CustomerActivity() {
  const { projects, loading } = useProjects();
  const recent = projects.slice(0, 3);

  return (
    <section className="py-20" style={{ background: '#FDFCF8' }}>
      <div className="container mx-auto px-6">
        <motion.div
          className="text-center mb-10"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          custom={0}
          variants={fadeUp}
        >
          <span className="text-sm font-medium text-primary uppercase tracking-wider">Your Projects</span>
          <h2 className="text-3xl md:text-4xl font-serif mt-2 mb-4">Recent activity</h2>
        </motion.div>

        {loading && (
          <div className="text-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
          </div>
        )}

        {!loading && recent.length > 0 && (
          <motion.div
            className="max-w-3xl mx-auto space-y-4"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
          >
            {recent.map((project, i) => (
              <motion.div key={project.id} custom={i * 0.1} variants={fadeUp}>
                <Link to="/dashboard">
                  <Card hover className="overflow-hidden">
                    <CardContent className="p-5 flex items-center gap-4">
                      {project.ai_concept && (
                        <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0">
                          <img src={project.ai_concept} alt={project.title} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-serif text-lg truncate">{project.title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[project.status] || 'bg-gray-100 text-gray-700'}`}>
                            {statusLabels[project.status] || project.status}
                          </span>
                          <span className="text-xs text-muted-foreground">{project.category}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(project.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}

            <div className="text-center pt-4">
              <Link to="/dashboard">
                <Button variant="outline" size="lg">
                  View All Projects
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
          </motion.div>
        )}

        {!loading && recent.length === 0 && (
          <motion.div
            className="max-w-lg mx-auto"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            custom={0}
            variants={fadeUp}
          >
            <Card className="overflow-hidden border-dashed">
              <CardContent className="p-10 text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                  <Sparkles className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-serif mb-3">Your creative journey starts here</h3>
                <p className="text-muted-foreground mb-6">
                  Describe your idea, let AI visualize it, and connect with talented creators who'll bring it to life.
                </p>
                <Link to="/create-project">
                  <Button variant="hero" size="lg" className="group">
                    Start Your First Project
                    <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </section>
  );
}

// ── Creator Recent Activity ─────────────────────────────────
function CreatorActivity() {
  const { business, loading: bizLoading } = useBusinessProfile();
  const { projects: matchedProjects, loading: matchLoading } = useMatchedProjects();
  const { offers, loading: offersLoading } = useBusinessOffers(business?.id);

  const loading = bizLoading || matchLoading || offersLoading;
  const activeOffers = offers.filter(o => o.status === 'pending').length;

  const stats = [
    {
      icon: FolderOpen,
      label: 'Matched Projects',
      value: matchedProjects.length,
      color: 'text-blue-600 bg-blue-100',
    },
    {
      icon: Send,
      label: 'Active Offers',
      value: activeOffers,
      color: 'text-amber-600 bg-amber-100',
    },
    {
      icon: MessageSquare,
      label: 'Total Offers Sent',
      value: offers.length,
      color: 'text-green-600 bg-green-100',
    },
  ];

  return (
    <section className="py-20" style={{ background: '#FDFCF8' }}>
      <div className="container mx-auto px-6">
        <motion.div
          className="text-center mb-10"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          custom={0}
          variants={fadeUp}
        >
          <span className="text-sm font-medium text-primary uppercase tracking-wider">Your Dashboard</span>
          <h2 className="text-3xl md:text-4xl font-serif mt-2 mb-4">Recent activity</h2>
        </motion.div>

        {loading && (
          <div className="text-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
          </div>
        )}

        {!loading && business && (
          <motion.div
            className="max-w-3xl mx-auto"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
          >
            <div className="grid sm:grid-cols-3 gap-4 mb-8">
              {stats.map((stat, i) => (
                <motion.div key={stat.label} custom={i * 0.1} variants={fadeUp}>
                  <Card className="text-center">
                    <CardContent className="p-6">
                      <div className={`w-12 h-12 rounded-xl ${stat.color} flex items-center justify-center mx-auto mb-3`}>
                        <stat.icon className="w-6 h-6" />
                      </div>
                      <div className="text-3xl font-serif font-bold mb-1">{stat.value}</div>
                      <div className="text-sm text-muted-foreground">{stat.label}</div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            <div className="text-center">
              <Link to="/business">
                <Button variant="outline" size="lg">
                  Go to Dashboard
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
          </motion.div>
        )}

        {!loading && !business && (
          <motion.div
            className="max-w-lg mx-auto"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            custom={0}
            variants={fadeUp}
          >
            <Card className="overflow-hidden border-dashed">
              <CardContent className="p-10 text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                  <Sparkles className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-serif mb-3">Set up your creator profile</h3>
                <p className="text-muted-foreground mb-6">
                  Complete your profile to start receiving matched projects from customers looking for your craft.
                </p>
                <Link to="/profile">
                  <Button variant="warm" size="lg" className="group">
                    Set Up Profile
                    <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </section>
  );
}

export default AuthenticatedHome;
