-- Fix cleanup_expired_cache function with search_path protection
CREATE OR REPLACE FUNCTION public.cleanup_expired_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.scraped_products_cache
  WHERE expires_at < now();
END;
$$;

-- Fix handle_new_user function with search_path protection
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, github_username, avatar_url, full_name, email)
  VALUES (
    new.id,
    new.raw_user_meta_data ->> 'user_name',
    new.raw_user_meta_data ->> 'avatar_url',
    COALESCE(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.email
  )
  ON CONFLICT (user_id) DO UPDATE SET
    github_username = EXCLUDED.github_username,
    avatar_url = EXCLUDED.avatar_url,
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    updated_at = now();
  RETURN new;
END;
$$;