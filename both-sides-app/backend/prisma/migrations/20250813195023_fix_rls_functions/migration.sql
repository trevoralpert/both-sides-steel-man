-- Migration: Fix RLS Functions Variable Name Collision
-- Fix the current_user_id() and current_user_role() functions that return null
-- Date: 2025-08-13

-- =============================================================================
-- STEP 1: Fix current_user_id() function - variable name collision issue
-- =============================================================================

-- Replace the function with proper variable names (don't drop due to policy dependencies)
CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS TEXT AS $$
DECLARE
  current_clerk_id TEXT;
  found_user_id TEXT;
BEGIN
  current_clerk_id := public.current_user_clerk_id();
  
  IF current_clerk_id IS NULL OR current_clerk_id = '' THEN
    RETURN NULL;
  END IF;
  
  SELECT id INTO found_user_id 
  FROM "public"."users" 
  WHERE clerk_id = current_clerk_id;
  
  RETURN found_user_id;
EXCEPTION
  WHEN others THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- STEP 2: Fix current_user_role() function - variable name collision issue
-- =============================================================================

-- Replace the function with proper variable names (don't drop due to policy dependencies)
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS "UserRole" AS $$
DECLARE
  current_clerk_id TEXT;
  found_user_role "UserRole";
BEGIN
  current_clerk_id := public.current_user_clerk_id();
  
  IF current_clerk_id IS NULL OR current_clerk_id = '' THEN
    RETURN NULL;
  END IF;
  
  SELECT role INTO found_user_role 
  FROM "public"."users" 
  WHERE clerk_id = current_clerk_id AND is_active = true;
  
  RETURN found_user_role;
EXCEPTION
  WHEN others THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
