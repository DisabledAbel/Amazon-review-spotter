-- Create historical analysis table to track review patterns over time
CREATE TABLE public.analysis_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_url TEXT NOT NULL,
  asin TEXT,
  product_title TEXT,
  analysis_score INTEGER NOT NULL,
  analysis_verdict TEXT NOT NULL,
  total_reviews INTEGER,
  fake_review_count INTEGER,
  confidence_score DECIMAL(3,2),
  analysis_data JSONB, -- Store detailed analysis results
  analyzed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.analysis_history ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own analysis history" 
ON public.analysis_history 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own analysis history" 
ON public.analysis_history 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_analysis_history_user_id ON public.analysis_history(user_id);
CREATE INDEX idx_analysis_history_product_url ON public.analysis_history(product_url);
CREATE INDEX idx_analysis_history_asin ON public.analysis_history(asin);
CREATE INDEX idx_analysis_history_analyzed_at ON public.analysis_history(analyzed_at DESC);

-- Create composite index for product timeline queries
CREATE INDEX idx_analysis_history_user_product_time ON public.analysis_history(user_id, product_url, analyzed_at DESC);