ALTER TABLE public.collections
  ADD COLUMN IF NOT EXISTS rhythm_weekday smallint CHECK (rhythm_weekday BETWEEN 0 AND 6),
  ADD COLUMN IF NOT EXISTS rhythm_time text,
  ADD COLUMN IF NOT EXISTS themes text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS taught_by text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS about_doc jsonb;

ALTER TABLE public.collection_items
  ADD COLUMN IF NOT EXISTS show_title_publicly boolean NOT NULL DEFAULT false;

CREATE TABLE public.clips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caption text NOT NULL DEFAULT '' CHECK (char_length(caption) <= 80),
  video_path text NOT NULL,
  poster_path text,
  duration_seconds integer,
  series_id uuid REFERENCES public.collections(id) ON DELETE SET NULL,
  source_content_id uuid REFERENCES public.content_items(id) ON DELETE SET NULL,
  source_seconds integer,
  release_at timestamptz,
  alt_text text,
  position integer NOT NULL DEFAULT 0,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX clips_series_idx ON public.clips(series_id, position);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.clips TO authenticated;
GRANT ALL ON public.clips TO service_role;
ALTER TABLE public.clips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage clips" ON public.clips FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.clips_touch() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END $$;
CREATE TRIGGER clips_touch BEFORE UPDATE ON public.clips FOR EACH ROW EXECUTE FUNCTION public.clips_touch();

CREATE POLICY "Admins read clip files" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'clips' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins upload clip files" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'clips' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update clip files" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'clips' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete clip files" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'clips' AND public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.series_stats(_collection_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN NOT public.has_role(auth.uid(), 'admin') THEN NULL ELSE jsonb_build_object(
    'follows', (SELECT count(*) FROM public.series_follows f WHERE f.collection_id = _collection_id),
    'parts', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'item_id', ci.id, 'content_id', ci.content_id, 'template_id', ci.template_id,
        'views', (SELECT count(DISTINCT p.user_id) FROM public.content_progress p WHERE (ci.content_id IS NOT NULL AND p.content_id = ci.content_id) OR (ci.template_id IS NOT NULL AND p.template_id = ci.template_id)),
        'finished', (SELECT count(DISTINCT p.user_id) FROM public.content_progress p WHERE p.finished_at IS NOT NULL AND ((ci.content_id IS NOT NULL AND p.content_id = ci.content_id) OR (ci.template_id IS NOT NULL AND p.template_id = ci.template_id AND p.day_number IS NULL))),
        'saves', (SELECT count(*) FROM public.saved_items s WHERE (ci.content_id IS NOT NULL AND s.content_item_id = ci.content_id) OR (ci.template_id IS NOT NULL AND s.devotional_template_id = ci.template_id)),
        'comments', (SELECT count(*) FROM public.comments c WHERE (ci.content_id IS NOT NULL AND c.content_id = ci.content_id) OR (ci.template_id IS NOT NULL AND c.template_id = ci.template_id))
      ) ORDER BY ci.position)
      FROM public.collection_items ci WHERE ci.collection_id = _collection_id), '[]'::jsonb)
  ) END
$$;
REVOKE ALL ON FUNCTION public.series_stats(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.series_stats(uuid) TO authenticated;