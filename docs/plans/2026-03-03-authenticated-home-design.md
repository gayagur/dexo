# Authenticated Home Page & Project Management — Design Doc

**Date:** 2026-03-03
**Status:** Approved

## Problem

After login, users land directly on a dashboard (CustomerDashboard or BusinessDashboard). This feels abrupt — the premium, warm landing page experience is lost. Users need a personalized home page that maintains the landing page's visual language while adapting content to their role.

Additionally, customers have no way to edit or delete their projects.

## Decisions

- **Approach:** Shared Section Components — extract reusable sections from LandingPage.tsx, compose both pages from them
- **Hero animation:** Hybrid — FloatingPaths with ~12 paths (down from 36) for lighter rendering
- **Categories:** Keep the 8-category grid on the authenticated home
- **Empty state:** Warm inspirational card with CTA (not hidden, not sample data)
- **Delete strategy:** Soft delete via `deleted_at` timestamp column

## Architecture

### Component Extraction

Extract from `LandingPage.tsx` into `src/components/landing/`:

| Component | Props | Notes |
|-----------|-------|-------|
| `HeroSection` | title, accentWord, subtitle, primaryCta, secondaryCta, pathCount? | FloatingPaths + gradient bg |
| `StepsSection` | sectionLabel, heading, subheading, steps[], ctaButton? | 3-card grid with images |
| `CategoriesSection` | sectionLabel, heading, subheading, categories[], ctaButton? | 8-card image grid |
| `FinalCTA` | heading, subheading, primaryCta, secondaryCta | Bottom CTA block |

Already standalone: `ValueProps`, `PremiumTestimonials`

### New Page: `src/pages/AuthenticatedHome.tsx`

Single component that reads `role` from `useAuth()` and renders either customer or creator variant by passing different content props to the shared section components.

### Route Changes

```
/           LandingPage (public, unchanged)
            HomeRoute: if authenticated -> redirect /home (was /dashboard or /business)
/home       AuthenticatedHome (protected, new)
/dashboard  CustomerDashboard (intact, reachable from nav)
/business   BusinessDashboard (intact, reachable from nav)
```

### Navigation Updates (AppHeader)

| Role | Links |
|------|-------|
| Customer | Home (/home), Projects (/dashboard), Creators (/browse-businesses) |
| Creator | Home (/home), Projects (/business), Offers (/business/offers), Messages (/business/conversations) |

Logo click -> /home (was dashboard).

## Content — Customer Home

**Hero:**
- Line 1: "Welcome back, {firstName}"
- Accent: "Bring your idea to life."
- Subtitle: "Post your custom request and receive offers from talented creators."
- Primary CTA: "Start a New Project" -> /create-project
- Secondary CTA: "Browse Creators" -> /browse-businesses

**Steps:**
1. Describe — "Tell us about your custom product. Our AI helps you create a detailed brief with visual concepts."
2. Receive Offers — "Matched creators review your brief and send you offers with pricing, timeline, and approach."
3. Choose & Collaborate — "Pick your favorite creator, chat directly, and watch your idea come to life."

**Categories:** Same 8 categories. Heading: "Explore categories". Subtitle: "Find the perfect creator for your next project."

**Benefits:** Customer-only ValueProps card.

**Recent Activity:**
- Up to 3 recent projects (title, status badge, category, date)
- "View All Projects" -> /dashboard
- Empty: Inspirational card + CTA

## Content — Creator Home

**Hero:**
- Line 1: "Welcome back, {firstName}"
- Accent: "Turn requests into business."
- Subtitle: "Discover new projects and grow your creative brand."
- Primary CTA: "Browse Open Projects" -> /business
- Secondary CTA: "Edit Your Profile" -> /profile

**Steps:**
1. Discover — "Projects matching your craft are delivered to your dashboard. Complete briefs with budgets and AI-generated visuals."
2. Send an Offer — "Review the brief, see the client's budget, and submit your offer with pricing and timeline."
3. Deliver & Earn — "Work directly with the client, deliver your craft, and build your reputation."

**Categories:** Same 8 categories. Heading: "Your marketplace". Subtitle: "Clients across all these crafts are looking for creators like you."

**Benefits:** Creator-only ValueProps card.

**Recent Activity:**
- 3 stat cards: matched projects, active offers, conversations
- "Go to Dashboard" -> /business
- Empty: "Set up your profile to start receiving matched projects" + CTA

## Project Edit & Delete

### Database Changes (migration 006)

```sql
ALTER TABLE public.projects ADD COLUMN deleted_at timestamptz DEFAULT NULL;

-- Update all SELECT policies to add: AND deleted_at IS NULL
-- Add soft-delete policy: customer can update deleted_at on own projects
```

### UI

- Action menu (...) on each project card in CustomerDashboard
- "Edit Project" — navigates to ProjectDetailPage with edit mode (draft projects only)
- "Delete Project" — AlertDialog confirmation, then sets deleted_at (draft + sent only, not if offers exist)
- useProjects hook: add deleteProject() method, filter deleted_at IS NULL in fetch

### Constraints

- Edit: only `draft` status projects
- Delete: only `draft` or `sent` status (no active offers or in-progress work)
- RLS enforces: only owner (customer_id = auth.uid()) can update deleted_at

## Files Changed

| File | Action |
|------|--------|
| `src/components/landing/HeroSection.tsx` | NEW — extracted from LandingPage |
| `src/components/landing/StepsSection.tsx` | NEW — extracted from LandingPage |
| `src/components/landing/CategoriesSection.tsx` | NEW — extracted from LandingPage |
| `src/components/landing/FinalCTA.tsx` | NEW — extracted from LandingPage |
| `src/pages/LandingPage.tsx` | REFACTOR — import extracted components (no visual change) |
| `src/pages/AuthenticatedHome.tsx` | NEW — role-based home page |
| `src/App.tsx` | EDIT — add /home route, change HomeRoute redirect |
| `src/components/app/AppHeader.tsx` | EDIT — add Home link, add creator nav links, logo -> /home |
| `src/pages/CustomerDashboard.tsx` | EDIT — add action menu, edit/delete |
| `src/hooks/useProjects.ts` | EDIT — add deleteProject, filter deleted |
| `supabase/migrations/006_soft_delete.sql` | NEW — add deleted_at, update RLS |
| `src/components/ValueProps.tsx` | EDIT — export individual card data for selective rendering |
