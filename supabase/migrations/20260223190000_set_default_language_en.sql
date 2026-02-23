-- Change default language from 'es' to 'en' for all new user profiles
ALTER TABLE public.profiles
  ALTER COLUMN language SET DEFAULT 'en';

-- Also update the profile creation trigger to explicitly set language = 'en'
-- (reads from user metadata if provided, falls back to 'en')
CREATE OR REPLACE FUNCTION create_profile_for_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, user_name, language, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'user_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'language', 'en'),
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
