
ALTER TABLE public.devotional_entries
  ADD COLUMN IF NOT EXISTS books_of_bible text[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS devotional_entries_books_of_bible_gin
  ON public.devotional_entries USING gin (books_of_bible);

-- Backfill: seed the array from the existing single-book column for rows that
-- have a confirmed book but an empty array.
UPDATE public.devotional_entries
SET books_of_bible = ARRAY[book_of_bible]
WHERE book_of_bible IS NOT NULL
  AND book_confirmed = true
  AND (books_of_bible IS NULL OR array_length(books_of_bible, 1) IS NULL);

-- Update autotag trigger to keep books_of_bible in sync when the primary book
-- is auto-detected and the array is otherwise empty.
CREATE OR REPLACE FUNCTION public.autotag_bible_book()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  scan_txt text;
  matched text;
BEGIN
  IF NEW.book_of_bible IS NOT NULL THEN
    -- If array is empty but the primary is confirmed, mirror it in the array.
    IF (NEW.books_of_bible IS NULL OR array_length(NEW.books_of_bible, 1) IS NULL)
       AND NEW.book_confirmed = true THEN
      NEW.books_of_bible := ARRAY[NEW.book_of_bible];
    END IF;
    RETURN NEW;
  END IF;

  scan_txt := concat_ws(' ',
    NEW.scripture_reference,
    NEW.entry_title,
    NEW.reflect_text,
    NEW.scripture_text,
    NEW.further_reading_text
  );

  matched := public.detect_bible_book(scan_txt);

  IF matched IS NOT NULL THEN
    NEW.book_of_bible   := matched;
    NEW.book_source     := 'auto';
    NEW.book_confirmed  := false;
  END IF;

  RETURN NEW;
END $$;
