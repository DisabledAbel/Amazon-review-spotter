-- Fix critical RLS policy vulnerability
-- First check and remove existing policies
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Create a secure policy that only allows users to view their own profile
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

-- Add index for better performance on user_id lookups
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_products_user_id ON public.saved_products(user_id);

-- Create audit log table for security monitoring
CREATE TABLE IF NOT EXISTS public.audit_log (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    table_name text NOT NULL,
    operation text NOT NULL,
    user_id uuid,
    old_data jsonb,
    new_data jsonb,
    timestamp timestamp with time zone DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Create a security definer function for audit logging
CREATE OR REPLACE FUNCTION public.log_security_event(
    event_type text,
    details jsonb DEFAULT '{}'::jsonb
)
RETURNS void AS $$
BEGIN
    INSERT INTO public.audit_log (
        table_name, 
        operation, 
        user_id, 
        new_data, 
        timestamp
    ) VALUES (
        'security_events',
        event_type,
        auth.uid(),
        details,
        now()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;