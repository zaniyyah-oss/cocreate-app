CREATE TABLE public.shop_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  subtitle text,
  price_label text,
  checkout_url text,
  cover_image_url text,
  season text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.shop_products TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.shop_products TO authenticated;
GRANT ALL ON public.shop_products TO service_role;
ALTER TABLE public.shop_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads active products" ON public.shop_products FOR SELECT TO anon, authenticated USING (is_active OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage products" ON public.shop_products FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER shop_products_updated_at BEFORE UPDATE ON public.shop_products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
INSERT INTO public.shop_products (slug, title, subtitle, price_label, checkout_url, season, sort_order)
VALUES ('abide-fall-winter', 'Abide · Fall/Winter', 'Digital planner for GoodNotes · 90 days · undated', '[PRICE]', NULL, 'fall_winter', 0);

CREATE TABLE public.subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE CHECK (email = lower(email) AND length(email) <= 255),
  first_name text CHECK (first_name IS NULL OR length(first_name) <= 120),
  tags text[] NOT NULL DEFAULT '{}',
  season_interest text,
  source text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.subscribers TO authenticated;
GRANT ALL ON public.subscribers TO service_role;
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read subscribers" ON public.subscribers FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER subscribers_updated_at BEFORE UPDATE ON public.subscribers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.subscribe_email(_email text, _first_name text, _tags text[], _season text, _source text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e text := lower(trim(_email)); allowed text[] := ARRAY['everything','monthly_letter','new_releases','devotionals','abide_seasons','paper_crew','app_updates'];
  clean text[];
BEGIN
  IF e !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' OR length(e) > 255 THEN RAISE EXCEPTION 'invalid email'; END IF;
  SELECT coalesce(array_agg(DISTINCT t), '{}') INTO clean FROM unnest(coalesce(_tags,'{}')) t WHERE t = ANY(allowed);
  INSERT INTO public.subscribers (email, first_name, tags, season_interest, source)
  VALUES (e, nullif(left(trim(_first_name),120),''), clean, nullif(left(_season,40),''), left(_source,40))
  ON CONFLICT (email) DO UPDATE SET
    tags = (SELECT array_agg(DISTINCT x) FROM unnest(subscribers.tags || EXCLUDED.tags) x),
    first_name = coalesce(EXCLUDED.first_name, subscribers.first_name),
    season_interest = coalesce(EXCLUDED.season_interest, subscribers.season_interest);
END $$;
GRANT EXECUTE ON FUNCTION public.subscribe_email(text,text,text[],text,text) TO anon, authenticated;