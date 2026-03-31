
-- Fix permissive channels INSERT policy
DROP POLICY IF EXISTS "Channels insertable by authenticated" ON public.channels;

CREATE POLICY "Channels insertable by authenticated" ON public.channels
FOR INSERT TO authenticated
WITH CHECK (
  (product_id IS NULL) OR is_product_member(auth.uid(), product_id)
);
