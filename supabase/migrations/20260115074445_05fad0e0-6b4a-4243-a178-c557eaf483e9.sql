-- Add email column to profiles table for easier user lookup
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Create index for email lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- Update trigger to also store email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public 
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (new.id, new.raw_user_meta_data ->> 'full_name', new.email);
  RETURN new;
END;
$$;