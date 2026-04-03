-- Allow business users to read customer profiles
-- ONLY when that customer has a project the business sent an offer on.
--
-- Chain: auth.uid() -> businesses.user_id -> businesses.id
--        -> offers.business_id -> offers.project_id
--        -> projects.customer_id -> profiles.id

CREATE POLICY "Business can read customer profiles via offers"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.offers o
      JOIN public.projects p ON p.id = o.project_id
      JOIN public.businesses b ON b.id = o.business_id
      WHERE p.customer_id = profiles.id
        AND b.user_id = auth.uid()
    )
  );
