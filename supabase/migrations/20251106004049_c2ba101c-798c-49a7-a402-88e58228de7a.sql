-- Create table for caching scraped Amazon product data
CREATE TABLE IF NOT EXISTS public.scraped_products_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asin TEXT NOT NULL UNIQUE,
  product_title TEXT,
  product_images JSONB DEFAULT '[]'::jsonb,
  product_videos JSONB DEFAULT '[]'::jsonb,
  reviews JSONB DEFAULT '[]'::jsonb,
  analysis JSONB,
  total_reviews INTEGER DEFAULT 0,
  scraped_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '24 hours'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index on ASIN for faster lookups
CREATE INDEX idx_scraped_products_cache_asin ON public.scraped_products_cache(asin);

-- Create index on expires_at for efficient cleanup
CREATE INDEX idx_scraped_products_cache_expires ON public.scraped_products_cache(expires_at);

-- Enable Row Level Security
ALTER TABLE public.scraped_products_cache ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to read cached data (public cache)
CREATE POLICY "Anyone can read cached product data" 
ON public.scraped_products_cache 
FOR SELECT 
USING (true);

-- Create policy to allow service role to insert/update cache
CREATE POLICY "Service role can manage cache" 
ON public.scraped_products_cache 
FOR ALL 
USING (auth.jwt()->>'role' = 'service_role');

-- Create function to automatically clean up expired cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.scraped_products_cache
  WHERE expires_at < now();
END;
$$;