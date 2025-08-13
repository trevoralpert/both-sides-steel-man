-- Test script to verify RLS implementation
-- Run this to check if RLS policies are properly applied

-- 1. Check that RLS is enabled on all tables
SELECT 
  schemaname,
  tablename,
  rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('users', 'profiles', 'classes', 'enrollments', 'organizations', 'audit_logs');

-- 2. List all RLS policies created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 3. Check if our custom functions exist
SELECT 
  routine_name, 
  routine_type,
  routine_schema
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('current_user_clerk_id', 'current_user_id', 'current_user_role', 'is_service_account')
ORDER BY routine_name;

-- 4. Test a simple function call (should return NULL when no user context is set)
SELECT 
  public.current_user_clerk_id() as clerk_id,
  public.current_user_id() as user_id,
  public.current_user_role() as user_role,
  public.is_service_account() as is_service;
