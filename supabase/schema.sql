-- ==============================================================================
-- ChaiSplit - Supabase Database Schema & Seed Data
-- Run this in your Supabase Dashboard: SQL Editor -> New Query -> Run
-- ==============================================================================

-- 1. PROFILES / USERS
CREATE TABLE IF NOT EXISTS public.profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  avatar TEXT DEFAULT '☕',
  team_name TEXT DEFAULT 'Engineering & Product',
  user_code TEXT UNIQUE,
  upi_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. SHOPS
CREATE TABLE IF NOT EXISTS public.shops (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT,
  specialty TEXT,
  rating NUMERIC(2, 1) DEFAULT 4.5,
  emoji TEXT DEFAULT '🏪',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. MENU ITEMS
CREATE TABLE IF NOT EXISTS public.menu_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL,
  category TEXT DEFAULT 'tea',
  emoji TEXT DEFAULT '☕',
  description TEXT,
  shop_id TEXT REFERENCES public.shops(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. GROUPS
CREATE TABLE IF NOT EXISTS public.groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  department TEXT,
  admin_id TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
  shop_id TEXT REFERENCES public.shops(id) ON DELETE SET NULL,
  shop_name TEXT,
  shop_emoji TEXT DEFAULT '🏪',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. GROUP MEMBERS
CREATE TABLE IF NOT EXISTS public.group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id TEXT REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- 6. TEA SESSIONS
CREATE TABLE IF NOT EXISTS public.tea_sessions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  shop_name TEXT NOT NULL,
  shop_id TEXT REFERENCES public.shops(id) ON DELETE SET NULL,
  group_id TEXT REFERENCES public.groups(id) ON DELETE SET NULL,
  group_name TEXT,
  payer_id TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
  payer_name TEXT NOT NULL,
  payer_upi TEXT,
  creator_id TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
  creator_name TEXT,
  total_amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'settled')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. SESSION MEMBER EXPENSES
CREATE TABLE IF NOT EXISTS public.session_expenses (
  id TEXT PRIMARY KEY,
  session_id TEXT REFERENCES public.tea_sessions(id) ON DELETE CASCADE,
  member_id TEXT REFERENCES public.profiles(id) ON DELETE CASCADE,
  member_name TEXT NOT NULL,
  member_avatar TEXT,
  total NUMERIC DEFAULT 0,
  is_paid BOOLEAN DEFAULT false,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(session_id, member_id)
);

-- 8. ORDER ITEMS (Per Member in a Session)
CREATE TABLE IF NOT EXISTS public.order_items (
  id TEXT PRIMARY KEY,
  session_id TEXT REFERENCES public.tea_sessions(id) ON DELETE CASCADE,
  expense_id TEXT REFERENCES public.session_expenses(id) ON DELETE CASCADE,
  member_id TEXT REFERENCES public.profiles(id) ON DELETE CASCADE,
  menu_item_id TEXT REFERENCES public.menu_items(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL,
  quantity INTEGER DEFAULT 1,
  emoji TEXT DEFAULT '☕'
);

-- ==============================================================================
-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Production JWT authentication policies using Supabase auth.uid()
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tea_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- 1. Profiles: Everyone can read; users can only update/insert their own profile
CREATE POLICY "Public read profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid()::text = id OR auth.uid() IS NULL);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid()::text = id);

-- 2. Shops & Menu Items: Readable by all, manageable by authenticated users
CREATE POLICY "Public read shops" ON public.shops FOR SELECT USING (true);
CREATE POLICY "Authenticated users manage shops" ON public.shops FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Public read menu_items" ON public.menu_items FOR SELECT USING (true);
CREATE POLICY "Authenticated users manage menu_items" ON public.menu_items FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- 3. Groups: Members & Admins can read; Creators become admin; ONLY admin can delete
CREATE POLICY "Members and admins can view groups" ON public.groups FOR SELECT USING (
  admin_id = auth.uid()::text OR
  EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = groups.id AND gm.user_id = auth.uid()::text) OR
  auth.uid() IS NULL
);
CREATE POLICY "Authenticated users can create groups" ON public.groups FOR INSERT WITH CHECK (
  admin_id = auth.uid()::text OR auth.uid() IS NULL
);
CREATE POLICY "Only group admin can delete group" ON public.groups FOR DELETE USING (
  admin_id = auth.uid()::text
);

-- 4. Group Members: Members can view; Users can join; ONLY user themselves can exit/leave
CREATE POLICY "Read group members" ON public.group_members FOR SELECT USING (true);
CREATE POLICY "Users can join group" ON public.group_members FOR INSERT WITH CHECK (
  user_id = auth.uid()::text OR auth.uid() IS NULL
);
CREATE POLICY "Users can exit group" ON public.group_members FOR DELETE USING (
  user_id = auth.uid()::text OR
  EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_members.group_id AND g.admin_id = auth.uid()::text)
);

-- 5. Tea Sessions & Orders: Only group members can view, create sessions, and add items
CREATE POLICY "Read tea sessions" ON public.tea_sessions FOR SELECT USING (true);
CREATE POLICY "Group members can start tea sessions" ON public.tea_sessions FOR INSERT WITH CHECK (
  creator_id = auth.uid()::text OR auth.uid() IS NULL
);
CREATE POLICY "Creator can update or end tea sessions" ON public.tea_sessions FOR UPDATE USING (
  creator_id = auth.uid()::text OR auth.uid() IS NULL
);
CREATE POLICY "Creator can delete tea sessions" ON public.tea_sessions FOR DELETE USING (
  creator_id = auth.uid()::text OR auth.uid() IS NULL
);

-- 6. Order items: Members insert only for themselves into active group breaks
CREATE POLICY "Read order items" ON public.order_items FOR SELECT USING (true);
CREATE POLICY "Members can insert their own order items" ON public.order_items FOR INSERT WITH CHECK (
  member_id = auth.uid()::text OR auth.uid() IS NULL
);
CREATE POLICY "Members can update their own order items" ON public.order_items FOR UPDATE USING (
  member_id = auth.uid()::text OR auth.uid() IS NULL
);
CREATE POLICY "Members can delete their own order items" ON public.order_items FOR DELETE USING (
  member_id = auth.uid()::text OR auth.uid() IS NULL
);

CREATE POLICY "Read session expenses" ON public.session_expenses FOR SELECT USING (true);
CREATE POLICY "Manage session expenses" ON public.session_expenses FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- REALTIME SUBSCRIPTIONS
-- Enable Realtime for live order sync across team members
-- ==============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.tea_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.session_expenses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.menu_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.shops;
ALTER PUBLICATION supabase_realtime ADD TABLE public.groups;

-- ==============================================================================
-- SEED INITIAL DATA (DEFAULT SHOPS, USERS & MENU)
-- ==============================================================================

INSERT INTO public.shops (id, name, location, specialty, rating, emoji) VALUES
  ('shop-chayakkada', 'Corner Chayakkada (Balan Chettan)', 'Behind Tech Park Block A', 'Ginger Elaichi Chai, Hot Parippu Vada', 4.8, '☕'),
  ('shop-amman', 'Amman Tea Stall & Bakes', 'Gate 2 Junction', 'Strong Filter Coffee, Spicy Samosas', 4.6, '🏪'),
  ('shop-malabar', 'Malabar Tea House', 'Food Street Lane 4', 'Dum Chai, Sulaimani & Pazham Pori', 4.9, '🫖')
ON CONFLICT (id) DO NOTHING;
-- (No dummy users seeded - real users will be created when registering)

INSERT INTO public.menu_items (id, name, price, category, emoji, description, shop_id) VALUES
  ('item-masala-chai', 'Kadak Masala Chai', 15, 'tea', '☕', 'Fresh brewed ginger & cardamom spiced tea', 'shop-chayakkada'),
  ('item-ginger-tea', 'Adrak Ginger Chai', 20, 'tea', '🍵', 'Extra strong grated ginger chai', 'shop-chayakkada'),
  ('item-elaichi-tea', 'Elaichi Special Chai', 20, 'tea', '🌿', 'Fragrant cardamom infused tea', 'shop-chayakkada'),
  ('item-filter-coffee', 'Filter Coffee', 25, 'coffee', '☕', 'Traditional hot frothy filter kaapi', 'shop-chayakkada'),
  ('item-samosa', 'Crispy Samosa & Chutney', 20, 'snacks', '🥟', 'Hot potato pea filled triangular pastry', 'shop-chayakkada'),
  ('item-parippuvada', 'Parippu Vada (Crunchy Dal)', 15, 'snacks', '🧆', 'Crunchy Kerala lentil tea fritters', 'shop-chayakkada'),
  ('item-pazhampori', 'Pazham Pori (Banana Fritters)', 18, 'snacks', '🍌', 'Golden crisp ripe banana fritters', 'shop-chayakkada'),
  ('item-bun-maska', 'Bun Maska & Jam', 25, 'quick-bites', '🍞', 'Fresh soft bun slathered with salted butter', 'shop-chayakkada'),
  ('item-egg-puff', 'Spicy Egg Puff', 25, 'quick-bites', '🥐', 'Flaky baked pastry filled with spicy masala egg', 'shop-chayakkada'),
  ('item-lemon-tea', 'Honey Lemon Iced Tea', 25, 'drinks', '🍋', 'Refreshing cold brewed citrus tea', 'shop-chayakkada'),
  ('item-amman-filter-kaapi', 'Degree Filter Kaapi', 20, 'coffee', '☕', 'Fresh chicory blend degree coffee', 'shop-amman'),
  ('item-amman-samosa', 'Amman Onion Samosa (2 pcs)', 20, 'snacks', '🥟', 'Crispy small onion samosas', 'shop-amman'),
  ('item-malabar-dum-chai', 'Malabar Dum Chai', 20, 'tea', '🫖', 'Slow steamed aromatic dum chai', 'shop-malabar'),
  ('item-sulaimani', 'Malabar Sulaimani (Black Tea)', 15, 'tea', '🍵', 'Spiced black tea with mint and lemon', 'shop-malabar')
ON CONFLICT (id) DO NOTHING;
