
-- Add admission_number column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS admission_number text UNIQUE;

-- Create a function to generate admission numbers like MSIT/2026/0001
CREATE OR REPLACE FUNCTION public.generate_admission_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_year text;
  next_seq int;
  new_admission text;
BEGIN
  current_year := to_char(now(), 'YYYY');
  
  SELECT COALESCE(MAX(
    CAST(
      NULLIF(split_part(admission_number, '/', 3), '') AS int
    )
  ), 0) + 1
  INTO next_seq
  FROM public.profiles
  WHERE admission_number LIKE 'MSIT/' || current_year || '/%';
  
  new_admission := 'MSIT/' || current_year || '/' || lpad(next_seq::text, 4, '0');
  
  RETURN new_admission;
END;
$$;
