
-- Add expires_at column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS expires_at timestamp with time zone;

-- Set expires_at for existing paid users to 30 days from now
UPDATE public.profiles SET expires_at = now() + interval '30 days' WHERE plano_ativo = true AND expires_at IS NULL;

-- Set expires_at for existing trial users to created_at + 4 hours
UPDATE public.profiles SET expires_at = created_at + interval '4 hours' WHERE (plano_ativo = false OR plano_ativo IS NULL) AND expires_at IS NULL;

-- Create trigger function to auto-set expires_at
CREATE OR REPLACE FUNCTION public.handle_plan_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.plano_ativo = true AND (OLD.plano_ativo = false OR OLD.plano_ativo IS NULL) THEN
    NEW.expires_at := now() + interval '30 days';
  END IF;
  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS on_plan_change ON public.profiles;
CREATE TRIGGER on_plan_change
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_plan_change();

-- Also update handle_new_user to set expires_at for new trial accounts
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, nome, slug, expires_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', 'Manicure'),
    COALESCE(
      NEW.raw_user_meta_data->>'slug',
      REPLACE(LOWER(COALESCE(NEW.raw_user_meta_data->>'nome', 'manicure-' || LEFT(NEW.id::text, 8))), ' ', '-')
    ),
    now() + interval '4 hours'
  );
  RETURN NEW;
END;
$$;
