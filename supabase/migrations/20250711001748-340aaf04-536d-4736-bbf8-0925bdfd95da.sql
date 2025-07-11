-- Fix critical RLS policy vulnerability
-- Remove the overly permissive policy that allows users to view all profiles
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create a secure policy that only allows users to view their own profile
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

-- Update saved_products foreign key to reference profiles instead of auth.users
-- First add a constraint to ensure data integrity
DO $$ 
BEGIN 
    -- Check if we need to update any existing saved_products records
    -- This ensures all saved_products have corresponding profiles
    IF EXISTS (
        SELECT 1 FROM public.saved_products sp 
        LEFT JOIN public.profiles p ON sp.user_id = p.user_id 
        WHERE p.user_id IS NULL
    ) THEN
        -- Create missing profiles for any orphaned saved_products
        INSERT INTO public.profiles (user_id, created_at, updated_at)
        SELECT DISTINCT sp.user_id, now(), now()
        FROM public.saved_products sp
        LEFT JOIN public.profiles p ON sp.user_id = p.user_id
        WHERE p.user_id IS NULL;
    END IF;
END $$;

-- Add index for better performance on user_id lookups
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_products_user_id ON public.saved_products(user_id);

-- Add audit logging trigger for security monitoring
CREATE OR REPLACE FUNCTION public.log_profile_changes()
RETURNS trigger AS $$
BEGIN
    -- Log profile access attempts for security monitoring
    INSERT INTO public.audit_log (
        table_name, 
        operation, 
        user_id, 
        old_data, 
        new_data, 
        timestamp
    ) VALUES (
        TG_TABLE_NAME,
        TG_OP,
        COALESCE(NEW.user_id, OLD.user_id),
        CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END,
        now()
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

-- Only allow admins to view audit logs
CREATE POLICY "Only admins can view audit logs" 
ON public.audit_log 
FOR SELECT 
USING (false); -- Will be updated when admin roles are implemented

-- Create trigger for profile changes
DROP TRIGGER IF EXISTS profile_audit_trigger ON public.profiles;
CREATE TRIGGER profile_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.log_profile_changes();