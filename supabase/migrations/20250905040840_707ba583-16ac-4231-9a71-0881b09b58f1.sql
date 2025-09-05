-- Create analysis_history table for storing product analysis data
CREATE TABLE public.analysis_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_url TEXT NOT NULL,
  product_title TEXT NOT NULL,
  product_image TEXT,
  asin TEXT NOT NULL,
  analysis_score NUMERIC NOT NULL,
  analysis_verdict TEXT NOT NULL,
  total_reviews INTEGER NOT NULL DEFAULT 0,
  fake_review_count INTEGER NOT NULL DEFAULT 0,
  confidence_score NUMERIC NOT NULL DEFAULT 0,
  analysis_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
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

CREATE POLICY "Users can update their own analysis history" 
ON public.analysis_history 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own analysis history" 
ON public.analysis_history 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_analysis_history_updated_at
BEFORE UPDATE ON public.analysis_history
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();