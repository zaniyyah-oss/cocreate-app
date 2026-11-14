DROP POLICY IF EXISTS "Anyone can send a contact message" ON public.contact_messages;
CREATE POLICY "Anyone can send a valid contact message" ON public.contact_messages
FOR INSERT TO anon, authenticated
WITH CHECK (
  (user_id IS NULL OR user_id = auth.uid())
  AND char_length(btrim(name)) BETWEEN 1 AND 200
  AND char_length(btrim(email)) BETWEEN 3 AND 320
  AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  AND char_length(btrim(reason)) BETWEEN 1 AND 100
  AND char_length(btrim(message)) BETWEEN 1 AND 5000
);

DROP POLICY IF EXISTS "Anyone reads page content" ON public.page_content;
CREATE POLICY "Anyone reads page content" ON public.page_content
FOR SELECT TO anon, authenticated
USING (page_key IS NOT NULL AND field_key IS NOT NULL);