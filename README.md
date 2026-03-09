<div align="center">

# ✨ DEXO

### The AI-Powered Interior Design Marketplace

**Design your dream space, beautifully.**

[![Live Demo](https://img.shields.io/badge/Live_Demo-dexo.info-cd853f?style=for-the-badge&logo=vercel&logoColor=white)](https://dexo.info)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)
[![Tailwind](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Vite](https://img.shields.io/badge/Vite-Build-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vite.dev)
[![Framer Motion](https://img.shields.io/badge/Framer_Motion-Animations-FF0055?style=for-the-badge&logo=framer&logoColor=white)](https://www.framer.com/motion/)

<!-- GIF PLACEHOLDER - will be added after deployment -->
<!-- ![DEXO Demo](./docs/demo.gif) -->

---

</div>

## 🎯 The Problem

The interior design market is completely fragmented:

| Homeowner Pain | Designer Pain |
|---|---|
| 😫 Endless DMs to explain what you want | 📩 Vague requests like "how much to redesign my living room?" |
| 💸 No transparent pricing | ⏰ Hours wasted on non-serious leads |
| 🔄 No way to compare designers | 📊 No structured quoting system |

**DEXO bridges this gap** with an AI-powered platform that generates structured design briefs, matches homeowners with the right designers and craftspeople, and handles the entire workflow from concept to transformed space.

## ⚡ Key Features

🤖 **AI Brief Generator** — Conversational chat flow that transforms vague ideas into detailed, structured design briefs with room type, style, budget, space size, materials & timeline

🎯 **Smart Matching** — Algorithm matches projects to designers by category, style, price & rating

💬 **Real-time Chat** — Supabase Realtime powered messaging between customers and designers

📊 **Designer Dashboard** — Manage incoming requests, send offers, track conversations

🔐 **Secure Auth** — Supabase authentication with role-based access (customer/creator)

📱 **Responsive Design** — Beautiful on desktop and mobile

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or bun
- Supabase account (free tier)

### Installation

```bash
# Clone the repo
git clone https://github.com/gayagur/dexo.git
cd dexo

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Run the database migration
# Copy supabase/migrations/001_schema.sql to Supabase SQL Editor

# Start development server
npm run dev
```

### Environment Variables

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/              # shadcn/ui components
│   ├── AIChatFlow       # AI brief generator chat
│   ├── ValueProps        # Landing page value cards
│   ├── PremiumTestimonials
│   └── ProtectedRoute   # Auth route guard
├── hooks/               # Custom React hooks
│   ├── useAuth          # Authentication
│   ├── useProjects      # Projects CRUD
│   ├── useOffers        # Offers management
│   ├── useMessages      # Real-time chat
│   ├── useBusinessProfile
│   └── useMatchedProjects
├── lib/                 # Utilities & config
│   ├── supabase         # Supabase client
│   ├── database.types   # TypeScript types
│   ├── pollinations     # AI image generation
│   └── matching         # Match scoring algorithm
├── pages/               # Route pages
│   ├── LandingPage      # Public landing
│   ├── AuthPage         # Sign in/up
│   ├── CustomerDashboard
│   ├── CreateProjectFlow # AI brief creation
│   ├── BusinessDashboard
│   ├── BusinessRequestPage
│   └── ...
└── App.tsx              # Router config
```

## 🗄️ Database Schema

```
profiles ──┐
           ├── businesses (1:1)
           ├── projects (1:many) ── offers (1:many)
           └── messages (via projects)
```

5 tables with Row Level Security (RLS) ensuring data isolation.

## 🎨 Design System

| Element | Style |
|---|---|
| Primary Color | Warm brown/orange `#C05621` |
| Background | Cream `#FDFCF8` |
| Headings | Serif font |
| Body | Sans-serif |
| Cards | `rounded-2xl` with hover effects |
| Badges | `rounded-full` pills |
| Animations | Framer Motion staggered reveals |

## 📈 Roadmap

- [x] Core marketplace (customer + creator flows)
- [x] Supabase auth + database
- [x] AI brief generator (local state machine)
- [x] Real-time messaging
- [x] Animated landing page with Framer Motion
- [x] Premium testimonials & value props sections
- [ ] Stripe payments + escrow
- [ ] AI concept image generation
- [ ] Advanced matching algorithm
- [ ] Mobile app (React Native)
- [ ] Multi-language (Hebrew + English)

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript 5 |
| Styling | Tailwind CSS, shadcn/ui |
| Animations | Framer Motion |
| Backend | Supabase (Auth, Database, Realtime) |
| Build | Vite 5 |
| Deployment | Vercel |
| Domain | dexo.info |

## 📄 License

This project is part of a university course (3rd year).

---

<div align="center">

**Built with ❤️ by Gaya**

[Live Demo](https://dexo.info) · [Report Bug](https://github.com/gayagur/dexo/issues)

</div>
