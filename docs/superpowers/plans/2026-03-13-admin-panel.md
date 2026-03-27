# Admin Panel Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full admin panel for DEXO with role-based access, creator approval workflows, CRUD management, in-app notifications, and an analytics dashboard.

**Architecture:** Admin is an orthogonal `is_admin` boolean on `profiles` — admins keep their customer/business role. Admin RLS policies use an `is_admin()` helper function (matching the existing `my_business_id()` pattern). The admin UI lives under `/admin/*` routes with a dedicated sidebar layout, using existing shadcn/ui components.

**Tech Stack:** React 18, TypeScript, Supabase (PostgreSQL + RLS + Realtime), shadcn/ui, Tailwind CSS, React Router 6, Zustand, TanStack React Query, Framer Motion, React Hook Form + Zod.

---

## File Structure

### Database
- **Create:** `supabase/migrations/010_admin_and_notifications.sql` — is_admin column, business status, notifications table, admin RLS policies, is_admin() helper

### Types
- **Modify:** `src/lib/database.types.ts` — Add Notification interface, BusinessStatus type, update Profile/Business interfaces, update Database type

### Config
- **Create:** `src/lib/admin-config.ts` — Hardcoded admin email list, admin constants

### Auth
- **Modify:** `src/hooks/useAuth.tsx` — Add `isAdmin` to auth state, fetch is_admin from profiles
- **Modify:** `src/components/ProtectedRoute.tsx` — Add `requireAdmin` prop

### Notifications
- **Create:** `src/hooks/useNotifications.ts` — Fetch, mark read, subscribe to realtime notifications
- **Create:** `src/lib/notifications.ts` — Helper to create notifications + email placeholder hook
- **Create:** `src/components/app/NotificationBell.tsx` — Bell icon with unread count + dropdown

### Admin Layout
- **Create:** `src/components/admin/AdminLayout.tsx` — Sidebar + header layout for admin pages
- **Create:** `src/components/admin/AdminSidebar.tsx` — Sidebar navigation with links

### Admin Shared Components
- **Create:** `src/components/admin/DataTable.tsx` — Reusable table with search, sort, pagination
- **Create:** `src/components/admin/ConfirmModal.tsx` — Confirmation modal for destructive actions
- **Create:** `src/components/admin/StatCard.tsx` — Metric card for analytics

### Admin Pages
- **Create:** `src/pages/admin/AdminDashboard.tsx` — Analytics overview page
- **Create:** `src/pages/admin/PendingCreators.tsx` — Creator approval queue
- **Create:** `src/pages/admin/ManageCreators.tsx` — All creators CRUD
- **Create:** `src/pages/admin/ManageClients.tsx` — All clients CRUD
- **Create:** `src/pages/admin/ManageProjects.tsx` — All projects CRUD
- **Create:** `src/pages/admin/ManageReviews.tsx` — Reviews moderation (placeholder — no reviews table yet, will create)

### Admin Hooks
- **Create:** `src/hooks/useAdmin.ts` — Admin data fetching (all users, businesses, projects, stats)

### Routing
- **Modify:** `src/App.tsx` — Add `/admin/*` routes
- **Modify:** `src/components/app/AppHeader.tsx` — Add admin link + notification bell

---

## Chunk 1: Database Migration + Types

### Task 1: Database migration for admin infrastructure

**Files:**
- Create: `supabase/migrations/010_admin_and_notifications.sql`

- [ ] **Step 1: Create migration file with admin columns and notifications table**

```sql
-- ============================================
-- DEXO — Admin Panel + Notifications
-- ============================================

-- 1. ADD is_admin TO PROFILES
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;
-- Add email column to profiles (needed for admin panel user management)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text NOT NULL DEFAULT '';

-- 2. ADD STATUS TO BUSINESSES (creator approval flow)
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending'
  CHECK (status IN ('pending', 'approved', 'rejected', 'suspended'));
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS rejection_reason text;

-- 3. CREATE NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('creator_approved', 'creator_rejected', 'system', 'info')),
  title text NOT NULL,
  message text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, read, created_at DESC)
  WHERE read = false;
CREATE INDEX idx_notifications_user_created ON public.notifications(user_id, created_at DESC);

-- 4. CREATE REVIEWS TABLE (for admin moderation)
CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_reviews_business ON public.reviews(business_id, created_at DESC);
CREATE INDEX idx_reviews_project ON public.reviews(project_id);
CREATE INDEX idx_businesses_status ON public.businesses(status);

-- 5. ADMIN HELPER FUNCTION (matches my_business_id() pattern from 005)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

-- 6. ADMIN RLS POLICIES
-- Admins can read ALL profiles
CREATE POLICY "Admins can read all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_admin());

-- Admins can update ALL profiles
CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (public.is_admin());

-- Admins can read ALL businesses
CREATE POLICY "Admins can read all businesses"
  ON public.businesses FOR SELECT
  USING (public.is_admin());

-- Admins can update ALL businesses
CREATE POLICY "Admins can update all businesses"
  ON public.businesses FOR UPDATE
  USING (public.is_admin());

-- Admins can delete businesses
CREATE POLICY "Admins can delete all businesses"
  ON public.businesses FOR DELETE
  USING (public.is_admin());

-- Admins can read ALL projects (including drafts and deleted)
CREATE POLICY "Admins can read all projects"
  ON public.projects FOR SELECT
  USING (public.is_admin());

-- Admins can update ALL projects
CREATE POLICY "Admins can update all projects"
  ON public.projects FOR UPDATE
  USING (public.is_admin());

-- Admins can delete ALL projects
CREATE POLICY "Admins can delete all projects"
  ON public.projects FOR DELETE
  USING (public.is_admin());

-- Admins can read ALL offers
CREATE POLICY "Admins can read all offers"
  ON public.offers FOR SELECT
  USING (public.is_admin());

-- Admins can read ALL messages
CREATE POLICY "Admins can read all messages"
  ON public.messages FOR SELECT
  USING (public.is_admin());

-- NOTIFICATIONS: users read their own
CREATE POLICY "Users can read own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

-- NOTIFICATIONS: users can update own (mark as read)
CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- NOTIFICATIONS: admins can insert for any user
CREATE POLICY "Admins can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (public.is_admin());

-- REVIEWS: anyone authenticated can read
CREATE POLICY "Anyone can read reviews"
  ON public.reviews FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- REVIEWS: customers can insert on completed projects
CREATE POLICY "Customers can insert reviews"
  ON public.reviews FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

-- REVIEWS: admins can delete reviews
CREATE POLICY "Admins can delete reviews"
  ON public.reviews FOR DELETE
  USING (public.is_admin());

-- REVIEWS: admins can read all reviews (redundant with above but explicit)
CREATE POLICY "Admins can read all reviews"
  ON public.reviews FOR SELECT
  USING (public.is_admin());

-- 7. UPDATE BUSINESS SELECT POLICY — only show approved businesses to non-admins
DROP POLICY IF EXISTS "Anyone can read businesses" ON public.businesses;
CREATE POLICY "Anyone can read approved businesses"
  ON public.businesses FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (status = 'approved' OR user_id = auth.uid())
  );

-- 8. SET EXISTING BUSINESSES TO APPROVED (grandfather existing creators)
UPDATE public.businesses SET status = 'approved' WHERE status = 'pending';
```

- [ ] **Step 2: Verify migration file exists**

Run: `ls supabase/migrations/010_admin_and_notifications.sql`
Expected: File listed

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/010_admin_and_notifications.sql
git commit -m "feat(admin): add migration for admin role, notifications, reviews, business status"
```

### Task 2: Update TypeScript types

**Files:**
- Modify: `src/lib/database.types.ts`

- [ ] **Step 1: Add new types and update existing interfaces**

Add `BusinessStatus` type, `Notification` interface, `Review` interface. Add `is_admin` and `email` to `Profile`. Add `status` and `rejection_reason` to `Business`. Update `Database` type.

```typescript
export type BusinessStatus = "pending" | "approved" | "rejected" | "suspended";
export type NotificationType = "creator_approved" | "creator_rejected" | "system" | "info";

// Update Profile to include:
//   is_admin: boolean;
//   email: string;

// Update Business to include:
//   status: BusinessStatus;
//   rejection_reason: string | null;

// Add:
export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface Review {
  id: string;
  project_id: string;
  customer_id: string;
  business_id: string;
  rating: number;
  comment: string;
  created_at: string;
}

// Add to Database.public.Tables:
//   notifications: { Row: Notification; Insert: Omit<Notification, "id" | "created_at" | "read">; Update: Partial<Omit<Notification, "id">> };
//   reviews: { Row: Review; Insert: Omit<Review, "id" | "created_at">; Update: Partial<Omit<Review, "id">> };
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/database.types.ts
git commit -m "feat(admin): update types for admin, notifications, reviews, business status"
```

### Task 3: Create admin config

**Files:**
- Create: `src/lib/admin-config.ts`

- [ ] **Step 1: Create config with admin email list**

```typescript
/**
 * Admin configuration.
 * To grant admin access, add the user's email here AND set is_admin = true
 * in the profiles table via Supabase dashboard.
 * This client-side list is a UI guard only — real security is enforced by RLS.
 */
export const ADMIN_EMAILS: string[] = [
  // Add admin emails here, e.g.:
  // "admin@dexo.info",
];

/** Check if an email is in the admin allowlist (UI-only guard) */
export function isAdminEmail(email: string | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/admin-config.ts
git commit -m "feat(admin): add admin config with email allowlist"
```

---

## Chunk 2: Auth Infrastructure + Protected Routes

### Task 4: Update useAuth to include isAdmin

**Files:**
- Modify: `src/hooks/useAuth.tsx`

- [ ] **Step 1: Add isAdmin to AuthState and fetch it**

In `AuthState` interface, add `isAdmin: boolean`.
In `AuthContextValue`, expose `isAdmin`.
In `fetchRole`, also fetch `is_admin` from profiles and return it alongside role.

The key change to `fetchRole` is:
```typescript
const fetchRole = useCallback(async (user: User): Promise<{ role: Role | null; isAdmin: boolean }> => {
  const { data } = await supabase
    .from("profiles")
    .select("role, is_admin")
    .eq("id", user.id)
    .single();

  if (data?.role) return { role: data.role as Role, isAdmin: data.is_admin ?? false };

  // ... existing fallback logic, return { role: ..., isAdmin: false } for all fallbacks
```

Update all call sites of `fetchRole` to destructure `{ role, isAdmin }`.
Update `setState` calls to include `isAdmin`.
Initial state: `isAdmin: false`.

- [ ] **Step 2: Verify no type errors**

Run: `npx tsc --noEmit 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useAuth.tsx
git commit -m "feat(admin): add isAdmin to auth context"
```

### Task 5: Update ProtectedRoute for admin access

**Files:**
- Modify: `src/components/ProtectedRoute.tsx`

- [ ] **Step 1: Add requireAdmin prop**

```typescript
interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: Role;
  requireAdmin?: boolean;
}

export const ProtectedRoute = ({ children, requiredRole, requireAdmin }: ProtectedRouteProps) => {
  const { user, role, isAdmin, loading } = useAuth();

  if (loading) { /* existing spinner */ }
  if (!user) { return <Navigate to="/" replace />; }

  // Admin gate
  if (requireAdmin && !isAdmin) {
    return <Navigate to="/home" replace />;
  }

  // existing role mismatch logic...
  if (requiredRole && !role) { /* existing spinner */ }
  if (requiredRole && role && role !== requiredRole) {
    return <Navigate to={role === "business" ? "/business" : "/dashboard"} replace />;
  }

  return <>{children}</>;
};
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ProtectedRoute.tsx
git commit -m "feat(admin): add requireAdmin guard to ProtectedRoute"
```

---

## Chunk 3: Notification System

### Task 6: Create notification helpers

**Files:**
- Create: `src/lib/notifications.ts`

- [ ] **Step 1: Create notification creation helper + email placeholder**

```typescript
import { supabase } from "./supabase";
import type { NotificationType } from "./database.types";

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export async function createNotification(params: CreateNotificationParams) {
  const { error } = await supabase.from("notifications").insert({
    user_id: params.userId,
    type: params.type,
    title: params.title,
    message: params.message,
    metadata: params.metadata ?? {},
  });
  if (error) console.error("[notifications] insert error:", error.message);

  // Email placeholder — wire up when email service is configured
  sendEmailNotification(params);
}

/** Placeholder for email notifications. Wire up Resend/SendGrid here. */
function sendEmailNotification(_params: CreateNotificationParams) {
  // TODO: Integrate with email service (Resend, SendGrid, etc.)
  // Example:
  // await resend.emails.send({
  //   from: 'DEXO <noreply@dexo.info>',
  //   to: userEmail,
  //   subject: params.title,
  //   html: params.message,
  // });
  console.log("[notifications] Email placeholder — would send:", _params.title);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/notifications.ts
git commit -m "feat(admin): add notification creation helper with email placeholder"
```

### Task 7: Create useNotifications hook

**Files:**
- Create: `src/hooks/useNotifications.ts`

- [ ] **Step 1: Create hook with realtime subscription**

```typescript
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import type { Notification } from "@/lib/database.types";

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!user) { setNotifications([]); setUnreadCount(0); setLoading(false); return; }
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) {
      setNotifications(data as Notification[]);
      setUnreadCount(data.filter((n: any) => !n.read).length);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  // Realtime subscription for new notifications
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("notifications")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        const newNotif = payload.new as Notification;
        setNotifications((prev) => [newNotif, ...prev]);
        setUnreadCount((prev) => prev + 1);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const markAsRead = useCallback(async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!user) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }, [user]);

  return { notifications, unreadCount, loading, markAsRead, markAllAsRead, refetch: fetchNotifications };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useNotifications.ts
git commit -m "feat(admin): add useNotifications hook with realtime subscription"
```

### Task 8: Create NotificationBell component

**Files:**
- Create: `src/components/app/NotificationBell.tsx`

- [ ] **Step 1: Create bell icon with dropdown**

A bell icon button that shows unread count badge, with a dropdown listing recent notifications. Uses shadcn DropdownMenu. Clicking a notification marks it as read. "Mark all as read" action at top.

- [ ] **Step 2: Add NotificationBell to AppHeader**

In `src/components/app/AppHeader.tsx`, import NotificationBell and render it next to the avatar dropdown (left of the avatar button).

- [ ] **Step 3: Commit**

```bash
git add src/components/app/NotificationBell.tsx src/components/app/AppHeader.tsx
git commit -m "feat(admin): add notification bell to app header"
```

---

## Chunk 4: Admin Layout + Shared Components

### Task 9: Create admin shared components

**Files:**
- Create: `src/components/admin/StatCard.tsx`
- Create: `src/components/admin/ConfirmModal.tsx`
- Create: `src/components/admin/DataTable.tsx`

- [ ] **Step 1: Create StatCard**

A card showing a metric label, value, and optional trend indicator. Clean, minimal, Stripe-style. Uses Card from shadcn/ui.

```typescript
// Props: { title: string; value: string | number; subtitle?: string; icon?: LucideIcon; trend?: { value: number; label: string } }
```

- [ ] **Step 2: Create ConfirmModal**

Wraps AlertDialog. Props: `open`, `onConfirm`, `onCancel`, `title`, `description`, `confirmLabel`, `variant` ("default" | "destructive"). For destructive actions, shows a red confirm button.

- [ ] **Step 3: Create DataTable**

A reusable table component with:
- Column definitions (key, label, render function, sortable flag)
- Search input filtering across all string columns
- Click-to-sort column headers
- Pagination (10/25/50 per page)
- Empty state
- Loading skeleton

Uses existing `Table` primitives from `src/components/ui/table.tsx`.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/StatCard.tsx src/components/admin/ConfirmModal.tsx src/components/admin/DataTable.tsx
git commit -m "feat(admin): add shared admin components (StatCard, ConfirmModal, DataTable)"
```

### Task 10: Create AdminSidebar

**Files:**
- Create: `src/components/admin/AdminSidebar.tsx`

- [ ] **Step 1: Create sidebar navigation**

Fixed sidebar with navigation links:
- Dashboard (BarChart3 icon)
- Pending Approvals (Clock icon, with pending count badge)
- Creators (Palette icon)
- Clients (Users icon)
- Projects (FolderOpen icon)
- Reviews (Star icon)

Divider, then:
- Back to Platform (ArrowLeft icon) — links to /home

Active state highlights current route. Uses Tailwind, no shadcn SidebarProvider (keep it simple).

- [ ] **Step 2: Commit**

```bash
git add src/components/admin/AdminSidebar.tsx
git commit -m "feat(admin): add admin sidebar navigation"
```

### Task 11: Create AdminLayout

**Files:**
- Create: `src/components/admin/AdminLayout.tsx`

- [ ] **Step 1: Create layout with sidebar + content area**

```typescript
// Sidebar (fixed 256px width) + main content area with header showing "Admin Panel" + user info
// Slightly more neutral styling — bg-gray-50/white instead of cream
// Props: { children: ReactNode }
```

- [ ] **Step 2: Commit**

```bash
git add src/components/admin/AdminLayout.tsx
git commit -m "feat(admin): add admin layout with sidebar"
```

---

## Chunk 5: Admin Data Hook

### Task 12: Create useAdmin hook

**Files:**
- Create: `src/hooks/useAdmin.ts`

- [ ] **Step 1: Create comprehensive admin data hook**

Provides functions for:
- `fetchAllProfiles()` — all profiles with role, is_admin, created_at
- `fetchAllBusinesses()` — all businesses joined with profile name/email
- `fetchAllProjects()` — all projects joined with customer name
- `fetchAllReviews()` — all reviews joined with customer name + business name
- `fetchPendingBusinesses()` — businesses where status = 'pending'
- `fetchAnalytics()` — aggregated stats (new users this week/month, project counts by status, pending creators count)
- `approveBusiness(businessId, adminNotes?)` — sets status to 'approved', creates notification
- `rejectBusiness(businessId, reason)` — sets status to 'rejected', creates notification with reason
- `updateProfile(profileId, updates)` — update any profile
- `updateBusiness(businessId, updates)` — update any business
- `updateProject(projectId, updates)` — update any project
- `deleteProject(projectId)` — hard delete
- `deleteReview(reviewId)` — hard delete
- `deleteBusiness(businessId)` — hard delete

Uses `createNotification` from `src/lib/notifications.ts` for approval/rejection flows.

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useAdmin.ts
git commit -m "feat(admin): add useAdmin hook for admin data operations"
```

---

## Chunk 6: Admin Pages

### Task 13: Create AdminDashboard (Analytics)

**Files:**
- Create: `src/pages/admin/AdminDashboard.tsx`

- [ ] **Step 1: Build analytics overview page**

Shows:
- Row of StatCards: Total Users, New Users (7d), Active Projects, Pending Creators
- Second row: Projects by Status (draft/sent/in_progress/completed breakdown)
- Clients vs Creators breakdown
- Recent activity feed (last 10 actions — new signups, new projects, new offers)

Uses AdminLayout wrapper. Fetches data via useAdmin hook.

- [ ] **Step 2: Commit**

```bash
git add src/pages/admin/AdminDashboard.tsx
git commit -m "feat(admin): add analytics dashboard page"
```

### Task 14: Create PendingCreators page

**Files:**
- Create: `src/pages/admin/PendingCreators.tsx`

- [ ] **Step 1: Build pending approvals page**

Shows pending businesses as cards (not table — more visual for review):
- Creator name, email, specialization (categories), date registered
- Portfolio preview (thumbnail grid of first 4 images)
- Approve button (green) → calls approveBusiness, shows success toast
- Reject button (red) → opens modal with textarea for reason, calls rejectBusiness
- Edit button → opens sheet/dialog with editable form for all business fields

Each action uses ConfirmModal. Approve/reject send notifications.

- [ ] **Step 2: Commit**

```bash
git add src/pages/admin/PendingCreators.tsx
git commit -m "feat(admin): add pending creators approval page"
```

### Task 15: Create ManageCreators page

**Files:**
- Create: `src/pages/admin/ManageCreators.tsx`

- [ ] **Step 1: Build creators management page**

DataTable showing all businesses:
- Columns: Name, Email, Categories, Status (badge), Rating, Registered, Actions
- Status filter dropdown (all/pending/approved/rejected/suspended)
- Search across name/email
- Row actions: Edit (opens sheet with form), Delete (ConfirmModal), Approve/Suspend toggle
- Edit form: all business fields editable (name, description, location, categories, styles, portfolio, price range)

- [ ] **Step 2: Commit**

```bash
git add src/pages/admin/ManageCreators.tsx
git commit -m "feat(admin): add creators management page"
```

### Task 16: Create ManageClients page

**Files:**
- Create: `src/pages/admin/ManageClients.tsx`

- [ ] **Step 1: Build clients management page**

DataTable showing all profiles where role = 'customer':
- Columns: Name, Email, Registered, Projects Count, Actions
- Search across name/email
- Row actions: Edit (name, email, avatar), Delete (ConfirmModal — sets profile to deleted? Or just remove)

- [ ] **Step 2: Commit**

```bash
git add src/pages/admin/ManageClients.tsx
git commit -m "feat(admin): add clients management page"
```

### Task 17: Create ManageProjects page

**Files:**
- Create: `src/pages/admin/ManageProjects.tsx`

- [ ] **Step 1: Build projects management page**

DataTable showing all projects:
- Columns: Title, Customer, Category, Status (badge), Budget, Created, Actions
- Status filter dropdown (all statuses + deleted)
- Search across title/customer name
- Row actions: Edit (title, description, category, status, budget), Delete (ConfirmModal — hard delete)

- [ ] **Step 2: Commit**

```bash
git add src/pages/admin/ManageProjects.tsx
git commit -m "feat(admin): add projects management page"
```

### Task 18: Create ManageReviews page

**Files:**
- Create: `src/pages/admin/ManageReviews.tsx`

- [ ] **Step 1: Build reviews moderation page**

DataTable showing all reviews:
- Columns: Customer, Business, Rating (stars), Comment (truncated), Date, Actions
- Search across comment text
- Row actions: View full review (dialog), Delete (ConfirmModal)
- No edit — reviews should only be deleted if inappropriate

- [ ] **Step 2: Commit**

```bash
git add src/pages/admin/ManageReviews.tsx
git commit -m "feat(admin): add reviews moderation page"
```

---

## Chunk 7: Routing + Header Integration

### Task 19: Add admin routes to App.tsx

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Import admin pages and add routes**

Add lazy imports for all admin pages. Add routes under `/admin/*`:

```typescript
{/* Admin routes */}
<Route path="/admin" element={
  <ProtectedRoute requireAdmin>
    <AdminDashboard />
  </ProtectedRoute>
} />
<Route path="/admin/pending" element={
  <ProtectedRoute requireAdmin>
    <PendingCreators />
  </ProtectedRoute>
} />
<Route path="/admin/creators" element={
  <ProtectedRoute requireAdmin>
    <ManageCreators />
  </ProtectedRoute>
} />
<Route path="/admin/clients" element={
  <ProtectedRoute requireAdmin>
    <ManageClients />
  </ProtectedRoute>
} />
<Route path="/admin/projects" element={
  <ProtectedRoute requireAdmin>
    <ManageProjects />
  </ProtectedRoute>
} />
<Route path="/admin/reviews" element={
  <ProtectedRoute requireAdmin>
    <ManageReviews />
  </ProtectedRoute>
} />
```

- [ ] **Step 2: Commit**

```bash
git add src/App.tsx
git commit -m "feat(admin): add admin routes to App.tsx"
```

### Task 20: Add admin link to AppHeader

**Files:**
- Modify: `src/components/app/AppHeader.tsx`

- [ ] **Step 1: Add admin dashboard link and notification bell**

In AppHeader:
1. Import `useNotifications` — no, NotificationBell handles its own state
2. Add `NotificationBell` component to the right side, before the avatar dropdown
3. If `isAdmin` is true, add a "Admin" link in the dropdown menu (with Shield icon) that navigates to `/admin`

- [ ] **Step 2: Commit**

```bash
git add src/components/app/AppHeader.tsx
git commit -m "feat(admin): add admin link and notification bell to header"
```

### Task 21: Update business visibility for approval status

**Files:**
- Modify: `src/pages/BrowseBusinesses.tsx`

- [ ] **Step 1: No code change needed**

The RLS policy already filters — only approved businesses (or own business) are returned by Supabase. The BrowseBusinesses page uses `supabase.from('businesses').select('*')` which will now automatically only return approved businesses. No frontend change required.

Verify this works by checking that the query still returns data after migration.

- [ ] **Step 2: Commit (skip if no changes needed)**

---

## Summary

**Total tasks:** 21
**Total new files:** 15
**Modified files:** 5
**Migration files:** 1

**Build order:**
1. Database migration (Task 1) — foundation
2. Types (Task 2-3) — TypeScript interfaces
3. Auth (Tasks 4-5) — isAdmin in context + route guard
4. Notifications (Tasks 6-8) — notification system
5. Admin components (Tasks 9-11) — shared UI
6. Admin hook (Task 12) — data layer
7. Admin pages (Tasks 13-18) — all 6 pages
8. Routing + integration (Tasks 19-21) — wire everything together
