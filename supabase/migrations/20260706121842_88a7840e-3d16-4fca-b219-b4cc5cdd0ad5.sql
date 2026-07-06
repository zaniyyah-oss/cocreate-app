
-- ============ ENUMS ============
CREATE TYPE public.content_type AS ENUM ('teaching', 'essay', 'podcast', 'blog');
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  avatar_url TEXT,
  member_since TIMESTAMPTZ NOT NULL DEFAULT now(),
  streak_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- ============ TOPICS ============
CREATE TABLE public.topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  color_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.topics TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.topics TO authenticated;
GRANT ALL ON public.topics TO service_role;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Topics are viewable by everyone" ON public.topics FOR SELECT USING (true);

-- ============ TOPIC SUBSCRIPTIONS ============
CREATE TABLE public.topic_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, topic_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.topic_subscriptions TO authenticated;
GRANT ALL ON public.topic_subscriptions TO service_role;
ALTER TABLE public.topic_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own subscriptions" ON public.topic_subscriptions FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ CONTENT ITEMS ============
-- Base table: full body only readable to signed-in users. Public preview via view.
CREATE TABLE public.content_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type content_type NOT NULL,
  title TEXT NOT NULL,
  excerpt TEXT,
  body TEXT,
  topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL,
  scripture_reference TEXT,
  author_name TEXT,
  published_at TIMESTAMPTZ,
  media_url TEXT,
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.content_items TO authenticated;
GRANT ALL ON public.content_items TO service_role;
ALTER TABLE public.content_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users read full content" ON public.content_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage content" ON public.content_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Public preview view (no body) — readable by anon and authenticated
CREATE VIEW public.content_items_public WITH (security_invoker=on) AS
  SELECT id, type, title, excerpt, topic_id, scripture_reference, author_name,
         published_at, thumbnail_url, created_at
  FROM public.content_items;
GRANT SELECT ON public.content_items_public TO anon, authenticated;
-- Allow the view's underlying SELECT to succeed for anon on the safe columns
CREATE POLICY "Anon can read preview columns" ON public.content_items FOR SELECT TO anon USING (true);
-- NOTE: with security_invoker=on the anon policy applies; body is excluded by the view definition.
-- Direct queries against content_items as anon would also return body, so we scope anon separately:
-- Revoke anon direct access to base table columns by not granting SELECT on the base table to anon.
-- (No GRANT SELECT ... TO anon was issued above for content_items, so PostgREST cannot query it as anon.)

-- ============ DEVOTIONAL TEMPLATES ============
CREATE TABLE public.devotional_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL,
  scripture_focus TEXT,
  reflect_prompt TEXT,
  pray_prompt TEXT,
  apply_prompt TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.devotional_templates TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.devotional_templates TO authenticated;
GRANT ALL ON public.devotional_templates TO service_role;
ALTER TABLE public.devotional_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Devotional templates are viewable by everyone" ON public.devotional_templates FOR SELECT USING (true);
CREATE POLICY "Admins manage devotional templates" ON public.devotional_templates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ DEVOTIONAL ENTRIES ============
CREATE TABLE public.devotional_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.devotional_templates(id) ON DELETE SET NULL,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reflect_text TEXT,
  pray_text TEXT,
  apply_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.devotional_entries TO authenticated;
GRANT ALL ON public.devotional_entries TO service_role;
ALTER TABLE public.devotional_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own devotional entries" ON public.devotional_entries FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ SAVED ITEMS ============
CREATE TABLE public.saved_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_item_id UUID REFERENCES public.content_items(id) ON DELETE CASCADE,
  devotional_template_id UUID REFERENCES public.devotional_templates(id) ON DELETE CASCADE,
  saved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((content_item_id IS NOT NULL)::int + (devotional_template_id IS NOT NULL)::int = 1)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_items TO authenticated;
GRANT ALL ON public.saved_items TO service_role;
ALTER TABLE public.saved_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own saved items" ON public.saved_items FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ NOTES ============
CREATE TABLE public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_item_id UUID REFERENCES public.content_items(id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notes TO authenticated;
GRANT ALL ON public.notes TO service_role;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own notes" ON public.notes FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ PINNED QUOTES ============
CREATE TABLE public.pinned_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_item_id UUID NOT NULL REFERENCES public.content_items(id) ON DELETE CASCADE,
  quote_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pinned_quotes TO authenticated;
GRANT ALL ON public.pinned_quotes TO service_role;
ALTER TABLE public.pinned_quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own pinned quotes" ON public.pinned_quotes FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ DISCUSSION COMMENTS ============
CREATE TABLE public.discussion_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  essay_id UUID NOT NULL REFERENCES public.content_items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  is_admin_pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.discussion_comments TO authenticated;
GRANT ALL ON public.discussion_comments TO service_role;
ALTER TABLE public.discussion_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users view discussion" ON public.discussion_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own comments" ON public.discussion_comments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own comments" ON public.discussion_comments FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own comments" ON public.discussion_comments FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Admins can pin/manage comments" ON public.discussion_comments FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ TIMESTAMP TRIGGERS ============
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_content_items_updated BEFORE UPDATE ON public.content_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_devotional_templates_updated BEFORE UPDATE ON public.devotional_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_devotional_entries_updated BEFORE UPDATE ON public.devotional_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_notes_updated BEFORE UPDATE ON public.notes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_discussion_comments_updated BEFORE UPDATE ON public.discussion_comments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ AUTO-CREATE PROFILE ON SIGNUP ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ SEED TOPICS ============
INSERT INTO public.topics (name, slug, color_key) VALUES
  ('Abiding', 'abiding', 'lime'),
  ('Theology of Work', 'theology-of-work', 'teal'),
  ('Identity in Christ', 'identity-in-christ', 'periwinkle'),
  ('Prayer', 'prayer', 'amber'),
  ('Calling', 'calling', 'fire'),
  ('Spiritual Formation', 'spiritual-formation', 'light-green'),
  ('Discipline', 'discipline', 'burgundy'),
  ('Suffering and Endurance', 'suffering-and-endurance', 'navy'),
  ('Friendship and Fellowship', 'friendship-and-fellowship', 'blush'),
  ('Kingdom Culture', 'kingdom-culture', 'teal'),
  ('Motherhood', 'motherhood', 'blush'),
  ('Creativity', 'creativity', 'amber'),
  ('Leadership', 'leadership', 'fire'),
  ('Obedience', 'obedience', 'lime'),
  ('Purpose', 'purpose', 'periwinkle');
