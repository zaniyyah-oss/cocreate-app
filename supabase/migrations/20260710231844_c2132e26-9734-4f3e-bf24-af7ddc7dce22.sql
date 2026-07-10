
DELETE FROM public.page_content WHERE page_key = 'home_devotional_widget';

INSERT INTO public.page_content (page_key, field_key, field_value) VALUES
  ('home_hero', 'heading', 'Building what''s been entrusted to you.'),
  ('home_hero', 'subheading', 'Essays, teachings, podcasts, and devotionals to help you build what''s been entrusted to you — your life, your work, your calling — with him, not just for him.'),
  ('site_nav', 'home_label', 'Home'),
  ('site_nav', 'explore_label', 'Explore'),
  ('site_nav', 'devotionals_label', 'Devotionals'),
  ('site_nav', 'profile_label', 'Profile'),
  ('site_footer', 'tagline', 'CoCreate — built with him, not just for him.')
ON CONFLICT DO NOTHING;
