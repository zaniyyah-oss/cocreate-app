
-- Add is_seed flag to demo content so it's auto-removed when real content arrives
ALTER TABLE public.content_items ADD COLUMN IF NOT EXISTS is_seed BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.devotional_templates ADD COLUMN IF NOT EXISTS is_seed BOOLEAN NOT NULL DEFAULT false;

-- Trigger: when any real (non-seed) content is inserted, wipe seed rows in both tables.
CREATE OR REPLACE FUNCTION public.purge_seed_content_on_real_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_seed IS TRUE THEN RETURN NEW; END IF;
  DELETE FROM public.content_items WHERE is_seed = true;
  DELETE FROM public.devotional_templates WHERE is_seed = true;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_purge_seeds_on_content ON public.content_items;
CREATE TRIGGER trg_purge_seeds_on_content
  AFTER INSERT ON public.content_items
  FOR EACH ROW EXECUTE FUNCTION public.purge_seed_content_on_real_insert();

DROP TRIGGER IF EXISTS trg_purge_seeds_on_template ON public.devotional_templates;
CREATE TRIGGER trg_purge_seeds_on_template
  AFTER INSERT ON public.devotional_templates
  FOR EACH ROW EXECUTE FUNCTION public.purge_seed_content_on_real_insert();

-- ============ SEED CONTENT ============
INSERT INTO public.content_items (type, title, excerpt, body, topic_id, scripture_reference, author_name, published_at, status, is_seed)
SELECT * FROM (VALUES
  ('teaching'::content_type, 'The Quiet Center', 'Learning to abide when the world will not stop moving.', 'There is a place inside every believer where noise cannot reach — a quiet center formed by the Spirit of God. In this teaching we walk slowly through John 15 and ask what it means to remain, to abide, to stay put when everything around us is asking us to move faster.', (SELECT id FROM public.topics WHERE slug='abiding'), 'John 15:4–5', 'Rev. Amara Okafor', now() - interval '2 days', 'published'::content_status, true),
  ('essay'::content_type, 'Work as Worship', 'Reclaiming the ordinary hours as holy ground.', 'Most of our lives are spent doing what feels unremarkable — answering emails, driving carpool, running a meeting. But scripture insists this ordinary labor is not separate from the sacred. It is the sacred, made visible in the world.', (SELECT id FROM public.topics WHERE slug='theology-of-work'), 'Colossians 3:23', 'Daniel Marsh', now() - interval '5 days', 'published'::content_status, true),
  ('podcast'::content_type, 'On Being Formed Slowly', 'A conversation about spiritual formation in a hurry-sick culture.', 'This episode sits down with spiritual director Ruth Alemayehu to talk about the long, unglamorous work of being shaped by God — and why the fruit of the Spirit will never grow in soil that is constantly being tilled.', (SELECT id FROM public.topics WHERE slug='spiritual-formation'), 'Galatians 5:22–23', 'The Practice Podcast', now() - interval '1 day', 'published'::content_status, true),
  ('teaching'::content_type, 'When God Feels Silent', 'A theology of waiting, and what to do while you wait.', 'Silence is not absence. This teaching draws on the psalms of lament and the story of Elijah at Horeb to offer a framework for the seasons when heaven feels closed.', (SELECT id FROM public.topics WHERE slug='suffering-and-endurance'), '1 Kings 19:11–13', 'Rev. Amara Okafor', now() - interval '9 days', 'published'::content_status, true),
  ('essay'::content_type, 'The Discipline of Small Yeses', 'Obedience is rarely dramatic.', 'We picture obedience as a mountaintop moment — a great sacrifice, a great yes. But the shape of a faithful life is built out of small yeses said in the kitchen, at the desk, on the commute.', (SELECT id FROM public.topics WHERE slug='obedience'), 'Luke 16:10', 'Priya Ramanathan', now() - interval '3 days', 'published'::content_status, true),
  ('blog'::content_type, 'Notes on Friendship', 'What the early church knew that we have forgotten.', 'Christian friendship is not a hobby. It is a means of grace. A few unhurried thoughts on why the church needs friendships that outlast seasons and cities.', (SELECT id FROM public.topics WHERE slug='friendship-and-fellowship'), 'Ecclesiastes 4:9–12', 'Jonah Weir', now() - interval '7 days', 'published'::content_status, true),
  ('podcast'::content_type, 'Prayer That Doesn''t Perform', 'Learning to pray without an audience.', 'Ruth and Amara talk about the interior life of prayer — what happens when we stop trying to sound spiritual and start speaking honestly with God.', (SELECT id FROM public.topics WHERE slug='prayer'), 'Matthew 6:6', 'The Practice Podcast', now() - interval '4 days', 'published'::content_status, true),
  ('teaching'::content_type, 'You Are Not Your Output', 'Identity in Christ for the exhausted.', 'A short teaching for anyone who has confused their worth with their productivity. We return to the baptism of Jesus and hear again the words that were spoken before he had done anything at all.', (SELECT id FROM public.topics WHERE slug='identity-in-christ'), 'Matthew 3:17', 'Rev. Amara Okafor', now() - interval '11 days', 'published'::content_status, true),
  ('essay'::content_type, 'Making Things as an Act of Worship', 'A theology of creativity for makers, writers, and builders.', 'The first thing we learn about God is that he makes. To create is not a distraction from spiritual life; it is one of its native languages.', (SELECT id FROM public.topics WHERE slug='creativity'), 'Genesis 1:1', 'Daniel Marsh', now() - interval '6 days', 'published'::content_status, true),
  ('blog'::content_type, 'A Quiet Guide to Sabbath', 'Small practices for a real rest.', 'Sabbath is less a rule to keep and more a gift to receive. Here are a few small practices that have helped our community actually rest.', (SELECT id FROM public.topics WHERE slug='discipline'), 'Exodus 20:8–10', 'Priya Ramanathan', now() - interval '12 days', 'published'::content_status, true),
  ('teaching'::content_type, 'The Table and the Kingdom', 'Why hospitality is a political act.', 'Kingdom culture is formed at tables. This teaching considers what it means that Jesus was accused, more than anything else, of eating with the wrong people.', (SELECT id FROM public.topics WHERE slug='kingdom-culture'), 'Luke 14:12–14', 'Rev. Amara Okafor', now() - interval '8 days', 'published'::content_status, true),
  ('essay'::content_type, 'On Being Called and Being Small', 'Purpose without grandiosity.', 'Not every calling is public. Not every faithful life is visible. A gentle essay on being called to a small place and staying there.', (SELECT id FROM public.topics WHERE slug='calling'), 'Micah 6:8', 'Jonah Weir', now() - interval '10 days', 'published'::content_status, true)
) AS v(type, title, excerpt, body, topic_id, scripture_reference, author_name, published_at, status, is_seed);

INSERT INTO public.devotional_templates (title, description, topic_id, scripture_focus, reflect_prompt, pray_prompt, apply_prompt, is_seed)
VALUES
  ('Morning Abiding', 'A short liturgy for the first ten minutes of your day.', (SELECT id FROM public.topics WHERE slug='abiding'), 'John 15:4', 'Where in your life are you being invited to remain, rather than rush?', 'Ask the Spirit to steady the parts of you that are already anxious about today.', 'Choose one moment today where you will stop and remember that you are already held.', true),
  ('Evening Examen', 'A gentle reflection to close the day.', (SELECT id FROM public.topics WHERE slug='spiritual-formation'), 'Psalm 139:23–24', 'Where did you feel most alive with God today, and where did you feel most distant?', 'Thank God for one specific mercy from today. Name it out loud.', 'Release the day''s unfinished work to God before you sleep.', true),
  ('Praying the Psalms', 'Let the psalter give you words when you have none.', (SELECT id FROM public.topics WHERE slug='prayer'), 'Psalm 62:5–8', 'Which line of today''s psalm meets you where you actually are?', 'Pray the psalm back to God slowly, in your own words.', 'Carry one phrase of the psalm with you into the next hour.', true),
  ('The Work Blessing', 'A short devotional to begin your workday.', (SELECT id FROM public.topics WHERE slug='theology-of-work'), 'Colossians 3:23', 'What part of today''s work feels most like a burden? What part feels most like a gift?', 'Offer your calendar to God, meeting by meeting.', 'Do one small piece of your work today as if you were doing it for Christ himself.', true);
