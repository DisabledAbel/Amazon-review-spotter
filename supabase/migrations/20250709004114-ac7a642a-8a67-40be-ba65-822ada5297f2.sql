-- Create saved products table
CREATE TABLE public.saved_products (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_url text NOT NULL,
  product_title text,
  product_image text,
  asin text,
  analysis_score integer,
  analysis_verdict text,
  saved_at timestamp with time zone DEFAULT now()
);

-- Enable RLS for saved products
ALTER TABLE public.saved_products ENABLE ROW LEVEL SECURITY;

-- Create policies for saved products
CREATE POLICY "Users can view their own saved products" 
ON public.saved_products 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own saved products" 
ON public.saved_products 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved products" 
ON public.saved_products 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved products" 
ON public.saved_products 
FOR DELETE 
USING (auth.uid() = user_id);

-- Update existing profiles table to add GitHub fields if they don't exist
DO $$ 
BEGIN 
    -- Add github_username column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'github_username') THEN
        ALTER TABLE public.profiles ADD COLUMN github_username text;
    END IF;
END $$;

-- Update the existing handle_new_user function to support GitHub
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;