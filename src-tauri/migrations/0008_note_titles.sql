-- Notes remember the problem title they were written on (v1.7), so "Your notes" can list a note for
-- a problem that is in no sheet. Older notes have no title; the list looks it up in the sheets.
ALTER TABLE sheet_notes ADD COLUMN title TEXT;
