
-- 1. Events table
CREATE TABLE public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN (
    'content_view','content_save','note_created','quote_pinned',
    'devotional_entry_created','topic_subscribed'
  )),
  content_id uuid REFERENCES public.content_items(id) ON DELETE CASCADE,
  topic_id uuid REFERENCES public.topics(id) ON DELETE CASCADE,
  template_id uuid REFERENCES public.devotional_templates(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX analytics_events_user_created_idx ON public.analytics_events(user_id, created_at DESC);
CREATE INDEX analytics_events_created_idx ON public.analytics_events(created_at DESC);
CREATE INDEX analytics_events_content_idx ON public.analytics_events(content_id);

GRANT SELECT, INSERT ON public.analytics_events TO authenticated;
GRANT ALL ON public.analytics_events TO service_role;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own events" ON public.analytics_events
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users read own events" ON public.analytics_events
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- 2. Cached recommendations
CREATE TABLE public.user_recommendations (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  content_ids uuid[] NOT NULL DEFAULT '{}',
  is_cold_start boolean NOT NULL DEFAULT true,
  computed_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.user_recommendations TO authenticated;
GRANT ALL ON public.user_recommendations TO service_role;
ALTER TABLE public.user_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own recommendations" ON public.user_recommendations
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 3. Popular fallback (safe, aggregate-only)
CREATE OR REPLACE FUNCTION public.get_popular_content_ids(_limit int DEFAULT 8)
RETURNS uuid[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(array_agg(content_id ORDER BY score DESC), ARRAY[]::uuid[])
  FROM (
    SELECT e.content_id,
      SUM(CASE e.event_type
        WHEN 'content_save' THEN 3
        WHEN 'content_view' THEN 1
        ELSE 0 END) AS score
    FROM public.analytics_events e
    JOIN public.content_items ci ON ci.id = e.content_id AND ci.status = 'published'
    WHERE e.content_id IS NOT NULL AND e.created_at > now() - interval '30 days'
    GROUP BY e.content_id
    ORDER BY score DESC
    LIMIT _limit
  ) p;
$$;
REVOKE ALL ON FUNCTION public.get_popular_content_ids(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_popular_content_ids(int) TO anon, authenticated;

-- 4. Recompute job
CREATE OR REPLACE FUNCTION public.compute_user_recommendations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  popular_ids uuid[];
BEGIN
  popular_ids := public.get_popular_content_ids(8);

  WITH weighted AS (
    SELECT
      e.user_id,
      e.event_type,
      e.content_id,
      e.topic_id,
      e.template_id,
      (CASE e.event_type
        WHEN 'topic_subscribed' THEN 5
        WHEN 'devotional_entry_created' THEN 4
        WHEN 'note_created' THEN 4
        WHEN 'content_save' THEN 3
        WHEN 'quote_pinned' THEN 3
        WHEN 'content_view' THEN 1
        ELSE 0
      END)::numeric
      * GREATEST(0::numeric, (60 - EXTRACT(EPOCH FROM (now() - e.created_at))/86400)::numeric / 60) AS w
    FROM public.analytics_events e
    WHERE e.created_at > now() - interval '60 days'
  ),
  topic_scores AS (
    SELECT w.user_id, w.topic_id AS topic_id, SUM(w.w) AS s
    FROM weighted w WHERE w.topic_id IS NOT NULL
    GROUP BY w.user_id, w.topic_id
    UNION ALL
    SELECT w.user_id, ci.topic_id, SUM(w.w)
    FROM weighted w JOIN public.content_items ci ON ci.id = w.content_id
    WHERE ci.topic_id IS NOT NULL
    GROUP BY w.user_id, ci.topic_id
    UNION ALL
    SELECT w.user_id, dt.topic_id, SUM(w.w)
    FROM weighted w JOIN public.devotional_templates dt ON dt.id = w.template_id
    WHERE dt.topic_id IS NOT NULL
    GROUP BY w.user_id, dt.topic_id
  ),
  topic_totals AS (
    SELECT user_id, topic_id, SUM(s) AS s
    FROM topic_scores GROUP BY user_id, topic_id
  ),
  type_scores AS (
    SELECT w.user_id, ci.type, SUM(w.w) AS s
    FROM weighted w JOIN public.content_items ci ON ci.id = w.content_id
    GROUP BY w.user_id, ci.type
  ),
  totals AS (
    SELECT user_id, SUM(w) AS total FROM weighted GROUP BY user_id
  ),
  excluded_content AS (
    SELECT DISTINCT e.user_id, e.content_id
    FROM public.analytics_events e
    WHERE e.content_id IS NOT NULL
      AND e.event_type IN ('content_view','content_save')
  ),
  ranked AS (
    SELECT
      u.user_id,
      ci.id AS content_id,
      COALESCE(tt.s, 0) + COALESCE(tps.s, 0) AS score,
      ci.published_at
    FROM (SELECT DISTINCT user_id FROM weighted) u
    CROSS JOIN public.content_items ci
    LEFT JOIN topic_totals tt ON tt.user_id = u.user_id AND tt.topic_id = ci.topic_id
    LEFT JOIN type_scores tps ON tps.user_id = u.user_id AND tps.type = ci.type
    LEFT JOIN excluded_content ex ON ex.user_id = u.user_id AND ex.content_id = ci.id
    WHERE ci.status = 'published'
      AND ex.content_id IS NULL
      AND (tt.s IS NOT NULL OR tps.s IS NOT NULL)
  ),
  top_per_user AS (
    SELECT user_id, content_id, score,
      row_number() OVER (PARTITION BY user_id ORDER BY score DESC, published_at DESC NULLS LAST) rn
    FROM ranked
  ),
  agg AS (
    SELECT user_id, array_agg(content_id ORDER BY rn) FILTER (WHERE rn <= 8) AS ids
    FROM top_per_user
    GROUP BY user_id
  )
  INSERT INTO public.user_recommendations (user_id, content_ids, is_cold_start, computed_at)
  SELECT
    t.user_id,
    CASE
      WHEN t.total >= 3 AND COALESCE(array_length(a.ids, 1), 0) >= 3 THEN a.ids
      ELSE popular_ids
    END,
    NOT (t.total >= 3 AND COALESCE(array_length(a.ids, 1), 0) >= 3),
    now()
  FROM totals t
  LEFT JOIN agg a ON a.user_id = t.user_id
  ON CONFLICT (user_id) DO UPDATE SET
    content_ids = EXCLUDED.content_ids,
    is_cold_start = EXCLUDED.is_cold_start,
    computed_at = EXCLUDED.computed_at;
END;
$$;
REVOKE ALL ON FUNCTION public.compute_user_recommendations() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.compute_user_recommendations() TO service_role;

-- 5. Schedule
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'compute-user-recommendations-daily',
  '15 4 * * *',
  $$SELECT public.compute_user_recommendations();$$
);
