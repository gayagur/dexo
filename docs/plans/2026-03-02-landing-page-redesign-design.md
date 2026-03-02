# Landing Page Redesign — Design Document

**Date:** 2026-03-02
**Status:** Approved
**Approach:** B — Two-Tone (light base + Midnight Slate final CTA)

---

## Problem

The current landing page has a dark brown testimonials section (#2c1810) that feels disconnected and dated. The overall palette lacks cohesion — sections shift between warm cream, dark brown, and primary orange without a clear system.

## Design Direction

Unified "Paper & Ink" aesthetic with one dramatic Midnight Slate closing section. Premium, artisanal, modern.

---

## Color System

| Token | Current HSL | New HSL | Hex | Usage |
|-------|-------------|---------|-----|-------|
| --background | 40 33% 98% | 43 50% 99% | #FDFCF8 | Page background |
| --primary | 20 55% 50% | 20 70% 44% | #C05621 | CTA buttons, small highlights only |
| --foreground | 25 20% 15% | 215 30% 15% | #1B2432 | Headings, primary text |
| --muted-foreground | 25 15% 45% | 215 14% 35% | #4A5568 | Body text, labels |
| --card | 40 30% 99% | 0 0% 100% / 70% | white/70 | Glassmorphic cards |
| --secondary | 35 30% 92% | 40 30% 95% | #F5F0E8 | Section tint backgrounds |
| --border | 30 20% 88% | 0 0% 100% / 50% | white/50 | Card borders (glass) |

Typography stays: DM Serif Display (headings) + Inter (body). No font changes needed.

---

## Per-Section Design

### 1. Hero
- Background: #FDFCF8 with subtle radial gradient (barely-visible warm glow top-right)
- Remove the "platform for custom creation" badge — let headline breathe
- Much more whitespace: py-24 instead of py-16
- "From idea to reality," in #1B2432; "together" in #C05621
- Subtitle in #4A5568 with larger line-height
- Primary CTA: #C05621 solid, white text; Secondary: outline #1B2432 border

### 2. How It Works (3 Steps)
- Glassmorphic cards: bg-white/70 backdrop-blur-xl border border-white/50
- Increased internal padding (p-8)
- Step number circles: #C05621 bg, white text
- "What happens" list bg: #FDFCF8
- Section bg: light, no gradient shift

### 3. Business Categories (8-card grid)
- Same glassmorphic card treatment
- Background: subtle #F9F5EF tint
- Keep images, hover zoom, benefit text

### 4. Value Props (Customers / Creators)
- Two glassmorphic cards side by side
- Checkmark circles: bg-[#C05621]/10 with #C05621 check
- CTA buttons in #C05621

### 5. Stats Row
- Light background, remove border-y
- Numbers in #C05621, labels in #4A5568

### 6. Testimonials (PremiumTestimonials — FULL RETHEME)
- Light #FDFCF8 background (was dark #2c1810)
- Card: bg-white/70 backdrop-blur-xl rounded-3xl border border-white/50
- All text in dark slate tones; stars #C05621
- Remove: floating particles, gradient orbs, continuous background animations
- Keep: carousel, nav arrows/dots (rethemed to light)
- Heading: plain #1B2432 text (no gradient text effect)
- Stats: numbers #C05621, labels #4A5568

### 7. Final CTA
- Midnight Slate background #1B2432, white text
- Primary button: #C05621 solid, white text
- Secondary: outline white/30 border
- No animated gradients

### 8. Footer
- Light #FDFCF8, unchanged structure

---

## Files to Change

1. **src/index.css** — Update CSS custom properties for new color system
2. **src/pages/LandingPage.tsx** — Update hero spacing, section backgrounds, card classes, remove badge
3. **src/components/PremiumTestimonials.tsx** — Full retheme from dark to light glassmorphic

## Build Sequence

1. Update CSS variables in index.css (foundation — everything else depends on this)
2. Update LandingPage.tsx sections
3. Retheme PremiumTestimonials.tsx
4. Verify: npx tsc --noEmit + visual check
