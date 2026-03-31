
-- ============================================
-- 1. Helper function: check product membership
-- ============================================
CREATE OR REPLACE FUNCTION public.is_product_member(_user_id uuid, _product_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.product_members
    WHERE user_id = _user_id AND product_id = _product_id
  )
$$;

-- Helper function: check channel membership
CREATE OR REPLACE FUNCTION public.is_channel_member(_user_id uuid, _channel_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.channel_members
    WHERE user_id = _user_id AND channel_id = _channel_id
  )
$$;

-- ============================================
-- 2. PRODUCTS - scope mutations to members/creator
-- ============================================
DROP POLICY IF EXISTS "Products updatable by authenticated" ON public.products;
DROP POLICY IF EXISTS "Products deletable by authenticated" ON public.products;
DROP POLICY IF EXISTS "Products insertable by authenticated" ON public.products;

CREATE POLICY "Products insertable by authenticated" ON public.products
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Products updatable by members" ON public.products
  FOR UPDATE TO authenticated
  USING (public.is_product_member(auth.uid(), id));

CREATE POLICY "Products deletable by creator" ON public.products
  FOR DELETE TO authenticated
  USING (auth.uid() = created_by);

-- ============================================
-- 3. PRODUCT_MEMBERS - scope to existing members
-- ============================================
DROP POLICY IF EXISTS "Product members insertable by authenticated" ON public.product_members;
DROP POLICY IF EXISTS "Product members deletable by authenticated" ON public.product_members;

CREATE POLICY "Product members insertable by members" ON public.product_members
  FOR INSERT TO authenticated
  WITH CHECK (public.is_product_member(auth.uid(), product_id) OR auth.uid() = user_id);

CREATE POLICY "Product members deletable by members" ON public.product_members
  FOR DELETE TO authenticated
  USING (public.is_product_member(auth.uid(), product_id));

-- ============================================
-- 4. TASKS - scope to product members
-- ============================================
DROP POLICY IF EXISTS "Tasks updatable by authenticated" ON public.tasks;
DROP POLICY IF EXISTS "Tasks deletable by authenticated" ON public.tasks;
DROP POLICY IF EXISTS "Tasks insertable by authenticated" ON public.tasks;

CREATE POLICY "Tasks insertable by product members" ON public.tasks
  FOR INSERT TO authenticated
  WITH CHECK (public.is_product_member(auth.uid(), product_id));

CREATE POLICY "Tasks updatable by product members" ON public.tasks
  FOR UPDATE TO authenticated
  USING (public.is_product_member(auth.uid(), product_id));

CREATE POLICY "Tasks deletable by product members" ON public.tasks
  FOR DELETE TO authenticated
  USING (public.is_product_member(auth.uid(), product_id));

-- ============================================
-- 5. LINKED_APPS - scope to product members
-- ============================================
DROP POLICY IF EXISTS "Linked apps insertable by authenticated" ON public.linked_apps;
DROP POLICY IF EXISTS "Linked apps deletable by authenticated" ON public.linked_apps;

CREATE POLICY "Linked apps insertable by product members" ON public.linked_apps
  FOR INSERT TO authenticated
  WITH CHECK (public.is_product_member(auth.uid(), product_id));

CREATE POLICY "Linked apps deletable by product members" ON public.linked_apps
  FOR DELETE TO authenticated
  USING (public.is_product_member(auth.uid(), product_id));

-- ============================================
-- 6. CAMPAIGNS - scope to product members
-- ============================================
DROP POLICY IF EXISTS "Campaigns insertable by authenticated" ON public.campaigns;
DROP POLICY IF EXISTS "Campaigns updatable by authenticated" ON public.campaigns;

CREATE POLICY "Campaigns insertable by product members" ON public.campaigns
  FOR INSERT TO authenticated
  WITH CHECK (public.is_product_member(auth.uid(), product_id));

CREATE POLICY "Campaigns updatable by product members" ON public.campaigns
  FOR UPDATE TO authenticated
  USING (public.is_product_member(auth.uid(), product_id));

-- ============================================
-- 7. DOCUMENTS - scope to product members
-- ============================================
DROP POLICY IF EXISTS "Documents insertable by authenticated" ON public.documents;
DROP POLICY IF EXISTS "Documents deletable by authenticated" ON public.documents;

CREATE POLICY "Documents insertable by product members" ON public.documents
  FOR INSERT TO authenticated
  WITH CHECK (public.is_product_member(auth.uid(), product_id) AND auth.uid() = uploaded_by);

CREATE POLICY "Documents deletable by product members" ON public.documents
  FOR DELETE TO authenticated
  USING (public.is_product_member(auth.uid(), product_id));

-- ============================================
-- 8. NOTIFICATIONS - restrict INSERT to own user_id
-- ============================================
DROP POLICY IF EXISTS "Notifications insertable by authenticated" ON public.notifications;

CREATE POLICY "Notifications insertable for own user" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 9. MESSAGES - scope SELECT to channel members
-- ============================================
DROP POLICY IF EXISTS "Messages viewable by authenticated" ON public.messages;

CREATE POLICY "Messages viewable by channel members" ON public.messages
  FOR SELECT TO authenticated
  USING (public.is_channel_member(auth.uid(), channel_id));

-- Also scope INSERT to channel members
DROP POLICY IF EXISTS "Messages insertable by authenticated" ON public.messages;

CREATE POLICY "Messages insertable by channel members" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id AND public.is_channel_member(auth.uid(), channel_id));

-- ============================================
-- 10. CHANNELS - scope to channel members for SELECT
-- ============================================
DROP POLICY IF EXISTS "Channels viewable by authenticated" ON public.channels;
DROP POLICY IF EXISTS "Channels insertable by authenticated" ON public.channels;

CREATE POLICY "Channels viewable by members" ON public.channels
  FOR SELECT TO authenticated
  USING (public.is_channel_member(auth.uid(), id));

CREATE POLICY "Channels insertable by authenticated" ON public.channels
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- ============================================
-- 11. CHANNEL_MEMBERS - scope INSERT
-- ============================================
DROP POLICY IF EXISTS "Channel members insertable by authenticated" ON public.channel_members;

CREATE POLICY "Channel members insertable by authenticated" ON public.channel_members
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR public.is_channel_member(auth.uid(), channel_id));

-- ============================================
-- 12. PROFILES - create a view that hides phone for non-owners
-- Replace broad SELECT with owner-only for sensitive fields
-- ============================================
DROP POLICY IF EXISTS "Profiles viewable by authenticated" ON public.profiles;

CREATE POLICY "Profiles viewable by authenticated" ON public.profiles
  FOR SELECT TO authenticated
  USING (true);

-- Create a secure view that masks phone for non-owners
CREATE OR REPLACE VIEW public.profiles_safe AS
SELECT
  id,
  user_id,
  display_name,
  avatar_url,
  role,
  department,
  created_at,
  updated_at,
  CASE WHEN auth.uid() = user_id THEN phone ELSE NULL END AS phone
FROM public.profiles;

-- ============================================
-- 13. Make documents bucket private
-- ============================================
UPDATE storage.buckets SET public = false WHERE id = 'documents';
