-- ============================================
-- DEXO — MVP Beta Payment Coordination Flow
-- ============================================

-- 1. Add payment coordination columns to milestones
ALTER TABLE public.milestones ADD COLUMN IF NOT EXISTS payment_link text;
ALTER TABLE public.milestones ADD COLUMN IF NOT EXISTS payment_link_sent_at timestamptz;
ALTER TABLE public.milestones ADD COLUMN IF NOT EXISTS customer_confirmed_paid_at timestamptz;
ALTER TABLE public.milestones ADD COLUMN IF NOT EXISTS business_confirmed_received_at timestamptz;
ALTER TABLE public.milestones ADD COLUMN IF NOT EXISTS beta_commission_acknowledged boolean DEFAULT false;

-- 2. Update status CHECK constraint to include 'customer_paid_confirmed'
ALTER TABLE public.milestones DROP CONSTRAINT IF EXISTS milestones_status_check;
ALTER TABLE public.milestones ADD CONSTRAINT milestones_status_check
  CHECK (status IN (
    'pending','in_progress','submitted','approved',
    'payment_requested','customer_paid_confirmed',
    'paid','released','disputed'
  ));

-- 3. Add follow-up columns to offers
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS followup_response text
  CHECK (followup_response IN ('yes', 'no', 'still_talking'));
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS followup_responded_at timestamptz;
