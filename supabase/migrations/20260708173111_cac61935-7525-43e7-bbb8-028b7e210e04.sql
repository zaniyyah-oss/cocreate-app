
-- Extend content_type enum
ALTER TYPE public.content_type ADD VALUE IF NOT EXISTS 'clip';
ALTER TYPE public.content_type ADD VALUE IF NOT EXISTS 'promoted';

-- Extend content_items
ALTER TABLE public.content_items
  ADD COLUMN IF NOT EXISTS video_url TEXT,
  ADD COLUMN IF NOT EXISTS duration_seconds INTEGER,
  ADD COLUMN IF NOT EXISTS external_url TEXT;

-- Recreate public view including new columns
DROP VIEW IF EXISTS public.content_items_public;
CREATE VIEW public.content_items_public AS
SELECT id, type, title, excerpt, topic_id, scripture_reference, author_name,
       published_at, thumbnail_url, video_url, duration_seconds, external_url, created_at
FROM public.content_items
WHERE status = 'published'::content_status;

GRANT SELECT ON public.content_items_public TO anon, authenticated;

-- daily_scriptures
CREATE TABLE IF NOT EXISTS public.daily_scriptures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  verse_text TEXT NOT NULL,
  reference TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.daily_scriptures TO anon, authenticated;
GRANT ALL ON public.daily_scriptures TO service_role;
ALTER TABLE public.daily_scriptures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Scriptures are readable by everyone" ON public.daily_scriptures FOR SELECT USING (true);
CREATE POLICY "Admins manage scriptures" ON public.daily_scriptures FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER update_daily_scriptures_updated_at BEFORE UPDATE ON public.daily_scriptures
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- sticky_notes
CREATE TABLE IF NOT EXISTS public.sticky_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(body) <= 160),
  color TEXT NOT NULL DEFAULT 'limelight' CHECK (color IN ('limelight','blush','amber','teal')),
  rotation SMALLINT NOT NULL DEFAULT 0 CHECK (rotation BETWEEN -6 AND 6),
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sticky_notes TO authenticated;
GRANT ALL ON public.sticky_notes TO service_role;
ALTER TABLE public.sticky_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own sticky notes" ON public.sticky_notes FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_sticky_notes_updated_at BEFORE UPDATE ON public.sticky_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- collections
CREATE TABLE IF NOT EXISTS public.collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  eyebrow TEXT,
  week_number INTEGER,
  description_md TEXT,
  writeup_title TEXT,
  writeup_body TEXT,
  banner_url TEXT,
  intro_video_content_id UUID REFERENCES public.content_items(id) ON DELETE SET NULL,
  featured_clip_content_id UUID REFERENCES public.content_items(id) ON DELETE SET NULL,
  devotional_template_id UUID REFERENCES public.devotional_templates(id) ON DELETE SET NULL,
  status content_status NOT NULL DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.collections TO anon, authenticated;
GRANT ALL ON public.collections TO service_role;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published collections readable by everyone" ON public.collections FOR SELECT
  USING (status = 'published'::content_status OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins manage collections" ON public.collections FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER update_collections_updated_at BEFORE UPDATE ON public.collections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- collection_items
CREATE TABLE IF NOT EXISTS public.collection_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  content_id UUID NOT NULL REFERENCES public.content_items(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  layout_slot TEXT NOT NULL DEFAULT 'half' CHECK (layout_slot IN ('lead','medium','half','promo')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (collection_id, content_id)
);
GRANT SELECT ON public.collection_items TO anon, authenticated;
GRANT ALL ON public.collection_items TO service_role;
ALTER TABLE public.collection_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Collection items readable by everyone" ON public.collection_items FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.collections c
            WHERE c.id = collection_id
              AND (c.status = 'published'::content_status
                   OR public.has_role(auth.uid(), 'admin'::app_role)))
  );
CREATE POLICY "Admins manage collection items" ON public.collection_items FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER update_collection_items_updated_at BEFORE UPDATE ON public.collection_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
