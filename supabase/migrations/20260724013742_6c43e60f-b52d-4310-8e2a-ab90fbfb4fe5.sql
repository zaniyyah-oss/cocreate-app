
-- Matcher: returns the abbreviation of the first book mentioned in the text, or NULL.
CREATE OR REPLACE FUNCTION public.detect_bible_book(_txt text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  result text;
BEGIN
  IF _txt IS NULL OR length(trim(_txt)) = 0 THEN RETURN NULL; END IF;

  WITH patterns(abbr, pat) AS (VALUES
    ('Gen',     '\m(genesis|gen)\M'),
    ('Exod',    '\m(exodus|exod|exo|ex)\M'),
    ('Lev',     '\m(leviticus|lev)\M'),
    ('Num',     '\m(numbers|num)\M'),
    ('Deut',    '\m(deuteronomy|deut|deu)\M'),
    ('Josh',    '\m(joshua|josh|jos)\M'),
    ('Judg',    '\m(judges|judg|jdg)\M'),
    ('Ruth',    '\m(ruth)\M'),
    ('1 Sam',   '\m(?:1|i|first|1st)\s+(?:samuel|sam)\M'),
    ('2 Sam',   '\m(?:2|ii|second|2nd)\s+(?:samuel|sam)\M'),
    ('1 Kgs',   '\m(?:1|i|first|1st)\s+(?:kings|kgs|kin)\M'),
    ('2 Kgs',   '\m(?:2|ii|second|2nd)\s+(?:kings|kgs|kin)\M'),
    ('1 Chr',   '\m(?:1|i|first|1st)\s+(?:chronicles|chron|chr)\M'),
    ('2 Chr',   '\m(?:2|ii|second|2nd)\s+(?:chronicles|chron|chr)\M'),
    ('Ezra',    '\m(ezra|ezr)\M'),
    ('Neh',     '\m(nehemiah|neh)\M'),
    ('Esth',    '\m(esther|esth|est)\M'),
    ('Job',     '\m(job)\M'),
    ('Ps',      '\m(psalms|psalm|pslm|psa|ps)\M'),
    ('Prov',    '\m(proverbs|prov|pro)\M'),
    ('Eccl',    '\m(ecclesiastes|eccl|ecc|qoh)\M'),
    ('Song',    '\m(song\s+of\s+(?:solomon|songs)|canticles|sos)\M'),
    ('Isa',     '\m(isaiah|isa)\M'),
    ('Jer',     '\m(jeremiah|jer)\M'),
    ('Lam',     '\m(lamentations|lam)\M'),
    ('Ezek',    '\m(ezekiel|ezek|eze)\M'),
    ('Dan',     '\m(daniel|dan)\M'),
    ('Hos',     '\m(hosea|hos)\M'),
    ('Joel',    '\m(joel)\M'),
    ('Amos',    '\m(amos|amo)\M'),
    ('Obad',    '\m(obadiah|obad|oba)\M'),
    ('Jonah',   '\m(jonah|jon)\M'),
    ('Mic',     '\m(micah|mic)\M'),
    ('Nah',     '\m(nahum|nah)\M'),
    ('Hab',     '\m(habakkuk|hab)\M'),
    ('Zeph',    '\m(zephaniah|zeph|zep)\M'),
    ('Hag',     '\m(haggai|hag)\M'),
    ('Zech',    '\m(zechariah|zech|zec)\M'),
    ('Mal',     '\m(malachi|mal)\M'),
    ('Matt',    '\m(matthew|matt|mat)\M'),
    ('Mark',    '\m(mark|mrk|mk)\M'),
    ('Luke',    '\m(luke|luk|lk)\M'),
    ('Acts',    '\m(acts|act)\M'),
    ('Rom',     '\m(romans|rom)\M'),
    ('1 Cor',   '\m(?:1|i|first|1st)\s+(?:corinthians|cor)\M'),
    ('2 Cor',   '\m(?:2|ii|second|2nd)\s+(?:corinthians|cor)\M'),
    ('Gal',     '\m(galatians|gal)\M'),
    ('Eph',     '\m(ephesians|eph)\M'),
    ('Phil',    '\m(philippians|phil|php)\M'),
    ('Col',     '\m(colossians|col)\M'),
    ('1 Thess', '\m(?:1|i|first|1st)\s+(?:thessalonians|thess|thes)\M'),
    ('2 Thess', '\m(?:2|ii|second|2nd)\s+(?:thessalonians|thess|thes)\M'),
    ('1 Tim',   '\m(?:1|i|first|1st)\s+(?:timothy|tim)\M'),
    ('2 Tim',   '\m(?:2|ii|second|2nd)\s+(?:timothy|tim)\M'),
    ('Titus',   '\m(titus|tit)\M'),
    ('Phlm',    '\m(philemon|phlm|phm)\M'),
    ('Heb',     '\m(hebrews|heb)\M'),
    ('Jas',     '\m(james|jas|jms)\M'),
    ('1 Pet',   '\m(?:1|i|first|1st)\s+(?:peter|pet|pt)\M'),
    ('2 Pet',   '\m(?:2|ii|second|2nd)\s+(?:peter|pet|pt)\M'),
    ('1 John',  '\m(?:1|i|first|1st)\s+(?:john|jhn|jn)\M'),
    ('2 John',  '\m(?:2|ii|second|2nd)\s+(?:john|jhn|jn)\M'),
    ('3 John',  '\m(?:3|iii|third|3rd)\s+(?:john|jhn|jn)\M'),
    ('Jude',    '\m(jude|jud)\M'),
    ('Rev',     '\m(revelation|revelations|rev|rv)\M'),
    -- Plain "John" gospel matched LAST via lower priority in ORDER BY (position wins)
    ('John',    '\m(john|jhn)\M')
  ),
  m AS (
    SELECT abbr, regexp_instr(_txt, pat, 1, 1, 0, 'i') AS pos
    FROM patterns
  )
  SELECT abbr INTO result
  FROM m
  WHERE pos > 0
  ORDER BY pos ASC, length(abbr) DESC
  LIMIT 1;

  RETURN result;
END $$;

-- Trigger: fires on every insert/update. Only sets the tag when book_of_bible is NULL.
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

DROP TRIGGER IF EXISTS trg_devotional_entries_autotag_book ON public.devotional_entries;
CREATE TRIGGER trg_devotional_entries_autotag_book
BEFORE INSERT OR UPDATE ON public.devotional_entries
FOR EACH ROW
EXECUTE FUNCTION public.autotag_bible_book();
