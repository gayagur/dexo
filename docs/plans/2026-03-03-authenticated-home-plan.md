# Authenticated Home & Project Management — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create personalized authenticated home pages (customer/creator) that mirror the landing page's visual language, update navigation, and add project edit/delete for customers.

**Architecture:** Extract reusable section components from LandingPage.tsx into `src/components/landing/`, compose both the existing public landing page and a new AuthenticatedHome page from them. Add soft-delete column + RLS for project management.

**Tech Stack:** React 18, TypeScript, React Router v6, Framer Motion, Tailwind CSS, Supabase (RLS + migrations), Lucide icons

**Design doc:** `docs/plans/2026-03-03-authenticated-home-design.md`

---

## Task 1: Extract HeroSection component

**Files:**
- Create: `src/components/landing/HeroSection.tsx`

**Step 1: Create the HeroSection component**

Extract FloatingPaths + fadeUp + hero section from LandingPage.tsx (lines 26-280) into a reusable component. Accept content as props. The `pathCount` prop defaults to 36 (landing page) but can be reduced (e.g. 12 for authenticated home).

```tsx
// src/components/landing/HeroSection.tsx
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay, ease: [0.25, 0.1, 0.25, 1.0] },
  }),
};

function FloatingPaths({ position, count = 36 }: { position: number; count?: number }) {
  const paths = Array.from({ length: count }, (_, i) => ({
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
      <svg className="w-full h-full" viewBox="0 0 696 316" fill="none">
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

interface CtaButton {
  label: string;
  to: string;
  variant?: 'hero' | 'outline';
}

interface HeroSectionProps {
  /** First line of the headline (e.g. "From idea to reality,") */
  titleLine: string;
  /** Accented second line (e.g. "together") — rendered in primary color */
  accentWord: string;
  /** Subtitle paragraph */
  subtitle: string;
  primaryCta: CtaButton;
  secondaryCta?: CtaButton;
  /** Number of animated paths (default 36 for landing, use 12 for lighter pages) */
  pathCount?: number;
  /** Whether hero fills the viewport (default true for landing, false for authenticated) */
  fullScreen?: boolean;
}

export function HeroSection({
  titleLine,
  accentWord,
  subtitle,
  primaryCta,
  secondaryCta,
  pathCount = 36,
  fullScreen = true,
}: HeroSectionProps) {
  return (
    <section
      className={`relative flex items-center justify-center ${
        fullScreen ? 'min-h-screen pt-16' : 'pt-8 pb-20'
      }`}
      style={{
        background: `
          radial-gradient(ellipse at 70% 15%, rgba(192,86,33,0.05) 0%, transparent 50%),
          radial-gradient(ellipse at 20% 80%, rgba(201,169,110,0.04) 0%, transparent 40%),
          #FDFCF8
        `,
      }}
    >
      <FloatingPaths position={1} count={pathCount} />
      <FloatingPaths position={-1} count={pathCount} />
      <div className="relative z-10 container mx-auto px-6 py-24 text-center">
        <motion.div
          className="max-w-4xl mx-auto space-y-8"
          initial="hidden"
          animate="visible"
        >
          <motion.h1
            custom={0}
            variants={fadeUp}
            className="text-6xl md:text-7xl lg:text-8xl font-serif font-bold leading-[1.05] text-[#1B2432]"
          >
            {titleLine}
          </motion.h1>

          <motion.span
            custom={0.12}
            variants={fadeUp}
            className="text-6xl md:text-7xl lg:text-8xl font-serif font-bold text-[#C05621] block"
          >
            {accentWord}
          </motion.span>

          <motion.p
            custom={0.25}
            variants={fadeUp}
            className="text-xl text-[#4A5568] max-w-2xl mx-auto leading-[1.8]"
          >
            {subtitle}
          </motion.p>

          <motion.div
            custom={0.38}
            variants={fadeUp}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
          >
            <Link to={primaryCta.to}>
              <Button
                variant={primaryCta.variant || 'hero'}
                size="xl"
                className="group h-14 px-10 text-lg rounded-xl shadow-lg shadow-primary/20"
              >
                {primaryCta.label}
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            {secondaryCta && (
              <Link to={secondaryCta.to}>
                <Button
                  variant={secondaryCta.variant || 'outline'}
                  size="xl"
                  className="h-14 px-10 text-lg rounded-xl border-[#1B2432]/20 text-[#1B2432] hover:bg-[#1B2432]/5"
                >
                  {secondaryCta.label}
                </Button>
              </Link>
            )}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

// Re-export fadeUp for other landing components that need it
export { fadeUp };
```

**Step 2: Verify file compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```
git add src/components/landing/HeroSection.tsx
git commit -m "feat: extract HeroSection component from landing page"
```

---

## Task 2: Extract StepsSection component

**Files:**
- Create: `src/components/landing/StepsSection.tsx`

**Step 1: Create the StepsSection component**

Extract the 3-step visual flow (LandingPage.tsx lines 282-386) into a reusable component. Steps data is passed as props.

```tsx
// src/components/landing/StepsSection.tsx
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { fadeUp } from './HeroSection';

export interface StepData {
  image: string;
  alt: string;
  number: number;
  title: string;
  badge?: string;
  priceBadges?: string[];
  ratingBadge?: string;
  description: string;
  items: string[];
  footer: { title: string; sub: string };
}

interface StepsSectionProps {
  sectionLabel: string;
  heading: string;
  subheading: string;
  steps: StepData[];
  ctaButton?: { label: string; to: string; variant?: 'hero' | 'warm' };
}

export function StepsSection({
  sectionLabel,
  heading,
  subheading,
  steps,
  ctaButton,
}: StepsSectionProps) {
  return (
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
          <span className="text-sm font-medium text-primary uppercase tracking-wider">
            {sectionLabel}
          </span>
          <h2 className="text-3xl md:text-4xl font-serif mt-2 mb-4">{heading}</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">{subheading}</p>
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
              <Button variant={ctaButton.variant || 'hero'} size="lg" className="group">
                {ctaButton.label}
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </motion.div>
        )}
      </div>
    </section>
  );
}
```

**Step 2: Verify**

Run: `npx tsc --noEmit`

**Step 3: Commit**

```
git add src/components/landing/StepsSection.tsx
git commit -m "feat: extract StepsSection component from landing page"
```

---

## Task 3: Extract CategoriesSection and FinalCTA components

**Files:**
- Create: `src/components/landing/CategoriesSection.tsx`
- Create: `src/components/landing/FinalCTA.tsx`

**Step 1: Create CategoriesSection**

Extract LandingPage.tsx lines 388-461.

```tsx
// src/components/landing/CategoriesSection.tsx
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { fadeUp } from './HeroSection';

export interface CategoryData {
  image: string;
  title: string;
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
          {categories.map((category, i) => (
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
```

**Step 2: Create FinalCTA**

Extract LandingPage.tsx lines 469-507.

```tsx
// src/components/landing/FinalCTA.tsx
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
          <Link to={primaryCta.to}>
            <Button
              size="xl"
              className="bg-[#C05621] text-white hover:bg-[#A84A1C] h-14 px-10 text-lg rounded-xl shadow-sm hover:shadow-md"
            >
              {primaryCta.label}
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
          {secondaryCta && (
            <Link to={secondaryCta.to}>
              <Button
                variant="outline"
                size="xl"
                className="border-[#1B2432]/20 text-[#1B2432] hover:bg-[#1B2432]/5 h-14 px-10 text-lg rounded-xl"
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
```

**Step 3: Verify**

Run: `npx tsc --noEmit`

**Step 4: Commit**

```
git add src/components/landing/CategoriesSection.tsx src/components/landing/FinalCTA.tsx
git commit -m "feat: extract CategoriesSection and FinalCTA components"
```

---

## Task 4: Refactor LandingPage to use extracted components

**Files:**
- Modify: `src/pages/LandingPage.tsx` (lines 26-70 remove FloatingPaths, lines 212-507 replace sections with component imports)
- Modify: `src/components/ValueProps.tsx` (export card data array)

**Step 1: Export ValueProps card data**

In `src/components/ValueProps.tsx`, change `const cards` (line 41) to `export const cards` so the authenticated home can import individual cards.

**Step 2: Rewrite LandingPage.tsx**

Replace the entire file with imports of extracted components. The scroll-tracking nav stays inline (it's unique to the public page). The FloatingPaths, fadeUp, steps, categories, and CTA sections are all replaced with the extracted components, using the original data as props.

Key changes:
- Remove FloatingPaths function (now in HeroSection)
- Remove fadeUp const (now exported from HeroSection)
- Replace hero section (lines 212-280) with `<HeroSection />`
- Replace steps section (lines 282-386) with `<StepsSection />`
- Replace categories section (lines 388-461) with `<CategoriesSection />`
- Replace final CTA section (lines 469-507) with `<FinalCTA />`
- Keep nav, ValueProps, PremiumTestimonials, and footer inline (they're already component imports or unique to landing)

The data arrays (`steps`, `businessCategories`) stay in the file as `const` passed to the components.

**Step 3: Verify visual parity**

Run: `npx vite build`
Expected: Build succeeds. Visually confirm the landing page looks identical at `http://localhost:5173/`.

**Step 4: Commit**

```
git add src/pages/LandingPage.tsx src/components/ValueProps.tsx
git commit -m "refactor: LandingPage uses extracted shared section components"
```

---

## Task 5: Create AuthenticatedHome page

**Files:**
- Create: `src/pages/AuthenticatedHome.tsx`

**Step 1: Create the authenticated home page**

This page reads role from `useAuth()` and renders shared section components with role-specific content. It fetches recent projects (customer) or business stats (creator) for the activity section.

Structure:
1. `AppLayout` wrapper (provides AppHeader + standard page chrome)
2. `HeroSection` — pathCount=12, fullScreen=false, role-specific copy
3. `StepsSection` — role-specific step data (same images, different text)
4. `CategoriesSection` — same categories, role-specific heading
5. Single `ValueCard` (imported from ValueProps) — show only the relevant role card
6. `RecentActivity` section — inline component, role-specific
7. `FinalCTA` — role-specific copy

The page uses:
- `useAuth()` for role + user name
- `useProjects()` for customer recent projects (already available, just `.slice(0, 3)`)
- `useMatchedProjects()` for creator matched project count
- `useBusinessOffers()` for creator active offers count

**Step 2: Verify**

Run: `npx tsc --noEmit`

**Step 3: Commit**

```
git add src/pages/AuthenticatedHome.tsx
git commit -m "feat: create AuthenticatedHome page with role-based content"
```

---

## Task 6: Wire up routing and navigation

**Files:**
- Modify: `src/App.tsx` (lines 38-39, add /home route)
- Modify: `src/components/app/AppHeader.tsx` (lines 37, 55-84)

**Step 1: Update App.tsx routing**

In `HomeRoute()` (line 39), change redirect from:
```tsx
return <Navigate to={role === "business" ? "/business" : "/dashboard"} replace />;
```
to:
```tsx
return <Navigate to="/home" replace />;
```

Add new route after line 55 (after public routes, before customer routes):
```tsx
<Route path="/home" element={
  <ProtectedRoute>
    <AuthenticatedHome />
  </ProtectedRoute>
} />
```

Add import at top: `import AuthenticatedHome from "./pages/AuthenticatedHome";`

**Step 2: Update AppHeader navigation**

In `src/components/app/AppHeader.tsx`:

Change `dashboardPath` (line 37) from:
```tsx
const dashboardPath = role === 'business' ? '/business' : '/dashboard';
```
to:
```tsx
const homePath = '/home';
```

Update logo link (line 56): change `to={dashboardPath}` to `to={homePath}`.

Update customer nav (lines 64-67): add Home link before Projects:
```tsx
{ to: '/home', label: 'Home' },
{ to: '/dashboard', label: 'Projects' },
{ to: '/browse-businesses', label: 'Creators' },
```

Add business nav (after the customer nav block, around line 84):
```tsx
{role === 'business' && (
  <nav className="hidden md:flex items-center gap-1">
    {[
      { to: '/home', label: 'Home' },
      { to: '/business', label: 'Projects' },
      { to: '/business/offers', label: 'Offers' },
      { to: '/business/conversations', label: 'Messages' },
    ].map(({ to, label }) => {
      const isActive = location.pathname === to;
      return (
        <Link key={to} to={to} className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
          isActive ? 'text-foreground bg-muted/70' : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
        }`}>
          {label}
        </Link>
      );
    })}
  </nav>
)}
```

**Step 3: Verify routing**

Run: `npx tsc --noEmit && npx vite build`
Expected: Build succeeds. After login, user should be redirected to /home.

**Step 4: Commit**

```
git add src/App.tsx src/components/app/AppHeader.tsx
git commit -m "feat: wire /home route and update navigation for both roles"
```

---

## Task 7: Database migration for soft delete

**Files:**
- Create: `supabase/migrations/006_soft_delete.sql`

**Step 1: Write the migration**

```sql
-- ============================================
-- DEXO — Soft delete for projects
-- ============================================

-- Add soft-delete column
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

-- Index for filtering out deleted projects efficiently
CREATE INDEX IF NOT EXISTS idx_projects_deleted_at ON public.projects(deleted_at)
  WHERE deleted_at IS NULL;

-- Update all project SELECT policies to exclude soft-deleted rows.
-- We drop and recreate each policy.

-- Customer read own projects (exclude deleted)
DROP POLICY IF EXISTS "Customer can read own projects" ON public.projects;
CREATE POLICY "Customer can read own projects"
  ON public.projects FOR SELECT
  USING (auth.uid() = customer_id AND deleted_at IS NULL);

-- Business read matching projects (exclude deleted)
DROP POLICY IF EXISTS "Businesses can read matching projects" ON public.projects;
CREATE POLICY "Businesses can read matching projects"
  ON public.projects FOR SELECT
  USING (
    status <> 'draft'
    AND deleted_at IS NULL
    AND public.my_business_categories() && array[category]
  );

-- Customer update policy remains (allows setting deleted_at on own projects)
-- The existing "Customer can update own projects" policy already allows this.
```

**Step 2: Deploy migration**

Run:
```bash
# First repair existing migrations if needed
npx supabase migration list
# Then push
echo "Y" | npx supabase db push
```

Expected: Migration applied successfully.

**Step 3: Commit**

```
git add supabase/migrations/006_soft_delete.sql
git commit -m "feat: add soft-delete column and update RLS for projects"
```

---

## Task 8: Add project delete capability to useProjects hook

**Files:**
- Modify: `src/hooks/useProjects.ts` (add deleteProject method, filter deleted)

**Step 1: Add deleteProject method and filter**

In `src/hooks/useProjects.ts`:

Add filter in fetchMyProjects query (after `.order("created_at", { ascending: false })`):
```tsx
.is("deleted_at", null)
```

Add new method before the return statement:
```tsx
const deleteProject = async (id: string): Promise<{ error: string | null }> => {
  const { error } = await supabase
    .from("projects")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("[useProjects] deleteProject error:", error.message);
    return { error: error.message };
  }

  // Remove from local state
  setProjects((prev) => prev.filter((p) => p.id !== id));
  return { error: null };
};
```

Update the return statement to include `deleteProject`:
```tsx
return { projects, loading, fetchMyProjects, createProject, updateProject, deleteProject };
```

**Step 2: Verify**

Run: `npx tsc --noEmit`

**Step 3: Commit**

```
git add src/hooks/useProjects.ts
git commit -m "feat: add deleteProject method with soft-delete support"
```

---

## Task 9: Add action menu and delete modal to CustomerDashboard

**Files:**
- Modify: `src/pages/CustomerDashboard.tsx` (ProjectCard component, lines 59-129)

**Step 1: Add action menu to ProjectCard**

Import additional components at the top of CustomerDashboard.tsx:
```tsx
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { MoreHorizontal, Trash2, Pencil } from 'lucide-react';
```

Update the `ProjectCard` component to accept `onDelete` and `onEdit` callbacks. Add a `...` button in the top-right corner of each card (replacing or alongside the hover arrow). The button opens a DropdownMenu with "Edit" (only for draft) and "Delete" (for draft or sent).

Add a `DeleteConfirmDialog` component that uses AlertDialog — shows project title, confirms deletion, calls `deleteProject()` from useProjects.

**Step 2: Wire up in main component**

In the main `CustomerDashboard` component:
- Destructure `deleteProject` from `useProjects()`
- Add state: `const [deleteTarget, setDeleteTarget] = useState<Project | null>(null)`
- Pass handlers to ProjectCard
- Render DeleteConfirmDialog at bottom of component

**Step 3: Verify**

Run: `npx tsc --noEmit && npx vite build`

**Step 4: Commit**

```
git add src/pages/CustomerDashboard.tsx
git commit -m "feat: add project action menu with delete confirmation"
```

---

## Task 10: Final verification and cleanup

**Step 1: Full build check**

Run: `npx tsc --noEmit && npx vite build`
Expected: Clean build, no errors.

**Step 2: Manual verification checklist**

- [ ] Landing page at `/` looks identical to before (no visual regression)
- [ ] After login as customer → redirected to `/home`
- [ ] Customer home: hero with name, steps, categories, benefits, recent projects
- [ ] Customer home empty state: inspirational card if no projects
- [ ] After login as business → redirected to `/home`
- [ ] Creator home: hero with name, steps, categories, benefits, activity stats
- [ ] Nav shows: Home, Projects, Creators (customer) / Home, Projects, Offers, Messages (creator)
- [ ] Logo click → /home
- [ ] `/dashboard` still works when navigated directly
- [ ] `/business` still works when navigated directly
- [ ] Project card `...` menu shows on customer dashboard
- [ ] Delete confirmation dialog works
- [ ] Deleted project disappears from list
- [ ] Deleted project stays soft-deleted in DB (deleted_at is set)

**Step 3: Deploy edge functions if any changed**

No edge functions changed in this plan. Only the DB migration needs deploying (done in Task 7).

**Step 4: Final commit**

```
git add -A
git commit -m "chore: final cleanup for authenticated home feature"
```
