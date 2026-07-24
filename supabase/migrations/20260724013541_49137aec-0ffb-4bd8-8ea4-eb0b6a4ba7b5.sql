
-- 1. Enum for book source
DO $$ BEGIN
  CREATE TYPE public.book_tag_source AS ENUM ('manual', 'auto');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Add columns to devotional_entries
ALTER TABLE public.devotional_entries
  ADD COLUMN IF NOT EXISTS book_of_bible text,
  ADD COLUMN IF NOT EXISTS book_source public.book_tag_source,
  ADD COLUMN IF NOT EXISTS book_confirmed boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS devotional_entries_book_of_bible_idx
  ON public.devotional_entries (user_id, book_of_bible);

-- 3. Reference table for Bible books
CREATE TABLE IF NOT EXISTS public.bible_books (
  abbreviation text PRIMARY KEY,
  full_name text NOT NULL,
  testament text NOT NULL CHECK (testament IN ('OT','NT')),
  sort_order smallint NOT NULL UNIQUE
);

GRANT SELECT ON public.bible_books TO anon, authenticated;
GRANT ALL ON public.bible_books TO service_role;

ALTER TABLE public.bible_books ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Bible books are readable by everyone" ON public.bible_books;
CREATE POLICY "Bible books are readable by everyone"
  ON public.bible_books FOR SELECT
  USING (true);

-- 4. Seed all 66 books
INSERT INTO public.bible_books (abbreviation, full_name, testament, sort_order) VALUES
  ('Gen','Genesis','OT',1),('Exod','Exodus','OT',2),('Lev','Leviticus','OT',3),
  ('Num','Numbers','OT',4),('Deut','Deuteronomy','OT',5),('Josh','Joshua','OT',6),
  ('Judg','Judges','OT',7),('Ruth','Ruth','OT',8),('1 Sam','1 Samuel','OT',9),
  ('2 Sam','2 Samuel','OT',10),('1 Kgs','1 Kings','OT',11),('2 Kgs','2 Kings','OT',12),
  ('1 Chr','1 Chronicles','OT',13),('2 Chr','2 Chronicles','OT',14),('Ezra','Ezra','OT',15),
  ('Neh','Nehemiah','OT',16),('Esth','Esther','OT',17),('Job','Job','OT',18),
  ('Ps','Psalms','OT',19),('Prov','Proverbs','OT',20),('Eccl','Ecclesiastes','OT',21),
  ('Song','Song of Solomon','OT',22),('Isa','Isaiah','OT',23),('Jer','Jeremiah','OT',24),
  ('Lam','Lamentations','OT',25),('Ezek','Ezekiel','OT',26),('Dan','Daniel','OT',27),
  ('Hos','Hosea','OT',28),('Joel','Joel','OT',29),('Amos','Amos','OT',30),
  ('Obad','Obadiah','OT',31),('Jonah','Jonah','OT',32),('Mic','Micah','OT',33),
  ('Nah','Nahum','OT',34),('Hab','Habakkuk','OT',35),('Zeph','Zephaniah','OT',36),
  ('Hag','Haggai','OT',37),('Zech','Zechariah','OT',38),('Mal','Malachi','OT',39),
  ('Matt','Matthew','NT',40),('Mark','Mark','NT',41),('Luke','Luke','NT',42),
  ('John','John','NT',43),('Acts','Acts','NT',44),('Rom','Romans','NT',45),
  ('1 Cor','1 Corinthians','NT',46),('2 Cor','2 Corinthians','NT',47),('Gal','Galatians','NT',48),
  ('Eph','Ephesians','NT',49),('Phil','Philippians','NT',50),('Col','Colossians','NT',51),
  ('1 Thess','1 Thessalonians','NT',52),('2 Thess','2 Thessalonians','NT',53),
  ('1 Tim','1 Timothy','NT',54),('2 Tim','2 Timothy','NT',55),('Titus','Titus','NT',56),
  ('Phlm','Philemon','NT',57),('Heb','Hebrews','NT',58),('Jas','James','NT',59),
  ('1 Pet','1 Peter','NT',60),('2 Pet','2 Peter','NT',61),('1 John','1 John','NT',62),
  ('2 John','2 John','NT',63),('3 John','3 John','NT',64),('Jude','Jude','NT',65),
  ('Rev','Revelation','NT',66)
ON CONFLICT (abbreviation) DO NOTHING;

-- 5. Optional FK for referential integrity (nullable)
ALTER TABLE public.devotional_entries
  DROP CONSTRAINT IF EXISTS devotional_entries_book_of_bible_fkey;
ALTER TABLE public.devotional_entries
  ADD CONSTRAINT devotional_entries_book_of_bible_fkey
  FOREIGN KEY (book_of_bible) REFERENCES public.bible_books(abbreviation)
  ON UPDATE CASCADE ON DELETE SET NULL;
