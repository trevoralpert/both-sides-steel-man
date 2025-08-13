-- Migration: Enable Row-Level Security (RLS)
-- Task 2.1.7: Enable RLS on all user-data tables
-- Date: 2025-08-13

-- =============================================================================
-- STEP 1: Enable Row-Level Security on all sensitive tables
-- =============================================================================

-- Enable RLS on users table
ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;

-- Enable RLS on profiles table  
ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;

-- Enable RLS on classes table
ALTER TABLE "public"."classes" ENABLE ROW LEVEL SECURITY;

-- Enable RLS on enrollments table
ALTER TABLE "public"."enrollments" ENABLE ROW LEVEL SECURITY;

-- Enable RLS on organizations table
ALTER TABLE "public"."organizations" ENABLE ROW LEVEL SECURITY;

-- Enable RLS on audit_logs table
ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- STEP 2: Create functions to get current user context
-- =============================================================================

-- This function will be used by RLS policies to identify the current user
-- It expects the application to set the current user context
CREATE OR REPLACE FUNCTION public.current_user_clerk_id()
RETURNS TEXT AS $$
BEGIN
  RETURN COALESCE(
    current_setting('app.current_user_clerk_id', true),
    NULL
  );
EXCEPTION
  WHEN others THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current user's database ID
CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS TEXT AS $$
DECLARE
  clerk_id TEXT;
  user_id TEXT;
BEGIN
  clerk_id := public.current_user_clerk_id();
  
  IF clerk_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  SELECT id INTO user_id 
  FROM "public"."users" 
  WHERE clerk_id = clerk_id;
  
  RETURN user_id;
EXCEPTION
  WHEN others THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current user's role
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS "UserRole" AS $$
DECLARE
  clerk_id TEXT;
  user_role "UserRole";
BEGIN
  clerk_id := public.current_user_clerk_id();
  
  IF clerk_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  SELECT role INTO user_role 
  FROM "public"."users" 
  WHERE clerk_id = clerk_id AND is_active = true;
  
  RETURN user_role;
EXCEPTION
  WHEN others THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- STEP 3: Create RLS policies for users table
-- =============================================================================

-- Policy: Users can view their own profile
CREATE POLICY "users_view_own" ON "public"."users"
  FOR SELECT
  USING (
    clerk_id = public.current_user_clerk_id()
  );

-- Policy: Users can update their own profile (limited fields)
CREATE POLICY "users_update_own" ON "public"."users"
  FOR UPDATE
  USING (
    clerk_id = public.current_user_clerk_id()
  );

-- Policy: Teachers can view students enrolled in their classes
CREATE POLICY "teachers_view_enrolled_students" ON "public"."users"
  FOR SELECT
  USING (
    public.current_user_role() = 'TEACHER'
    AND id IN (
      SELECT e.user_id 
      FROM "public"."enrollments" e
      JOIN "public"."classes" c ON e.class_id = c.id
      WHERE c.teacher_id = public.current_user_id()
        AND e.enrollment_status = 'ACTIVE'
    )
  );

-- Policy: Admins have full access to users in their organization
CREATE POLICY "admins_full_access" ON "public"."users"
  FOR ALL
  USING (
    public.current_user_role() = 'ADMIN'
    -- TODO: Add organization-level restriction when we implement org admin roles
  );

-- =============================================================================
-- STEP 4: Create RLS policies for profiles table  
-- =============================================================================

-- Policy: Users can view and update their own profile
CREATE POLICY "profiles_own_access" ON "public"."profiles"
  FOR ALL
  USING (
    user_id = public.current_user_id()
  );

-- Policy: Teachers can view profiles of enrolled students (limited access)
CREATE POLICY "teachers_view_student_profiles" ON "public"."profiles"
  FOR SELECT
  USING (
    public.current_user_role() = 'TEACHER'
    AND user_id IN (
      SELECT e.user_id 
      FROM "public"."enrollments" e
      JOIN "public"."classes" c ON e.class_id = c.id
      WHERE c.teacher_id = public.current_user_id()
        AND e.enrollment_status = 'ACTIVE'
    )
  );

-- =============================================================================
-- STEP 5: Create RLS policies for classes table
-- =============================================================================

-- Policy: Teachers can view and manage their own classes
CREATE POLICY "classes_teacher_own" ON "public"."classes"
  FOR ALL
  USING (
    teacher_id = public.current_user_id()
  );

-- Policy: Students can view classes they're enrolled in
CREATE POLICY "classes_student_enrolled" ON "public"."classes"
  FOR SELECT
  USING (
    public.current_user_role() = 'STUDENT'
    AND id IN (
      SELECT class_id 
      FROM "public"."enrollments" 
      WHERE user_id = public.current_user_id()
        AND enrollment_status IN ('ACTIVE', 'PENDING')
    )
  );

-- Policy: Organization admins can view classes in their organization
CREATE POLICY "classes_org_admin" ON "public"."classes"
  FOR ALL
  USING (
    public.current_user_role() = 'ADMIN'
    -- TODO: Add organization-level check when we implement org admin relationships
  );

-- =============================================================================
-- STEP 6: Create RLS policies for enrollments table
-- =============================================================================

-- Policy: Students can view their own enrollments
CREATE POLICY "enrollments_student_own" ON "public"."enrollments"
  FOR SELECT
  USING (
    user_id = public.current_user_id()
  );

-- Policy: Teachers can view enrollments in their classes
CREATE POLICY "enrollments_teacher_classes" ON "public"."enrollments"
  FOR ALL
  USING (
    class_id IN (
      SELECT id 
      FROM "public"."classes" 
      WHERE teacher_id = public.current_user_id()
    )
  );

-- =============================================================================
-- STEP 7: Create RLS policies for organizations table
-- =============================================================================

-- Policy: Users can view organizations they're associated with
CREATE POLICY "organizations_member_access" ON "public"."organizations"
  FOR SELECT
  USING (
    -- Allow viewing organizations where user teaches classes
    id IN (
      SELECT DISTINCT organization_id 
      FROM "public"."classes" 
      WHERE teacher_id = public.current_user_id()
    )
    OR
    -- Or is enrolled as a student
    id IN (
      SELECT DISTINCT c.organization_id
      FROM "public"."classes" c
      JOIN "public"."enrollments" e ON c.id = e.class_id
      WHERE e.user_id = public.current_user_id()
    )
  );

-- =============================================================================
-- STEP 8: Create RLS policies for audit_logs table
-- =============================================================================

-- Policy: Users can view audit logs for their own actions/entities
CREATE POLICY "audit_logs_own_access" ON "public"."audit_logs"
  FOR SELECT
  USING (
    actor_id = public.current_user_id()
    OR 
    (entity_type = 'user' AND entity_id = public.current_user_id())
    OR
    (entity_type = 'profile' AND entity_id IN (
      SELECT id FROM "public"."profiles" WHERE user_id = public.current_user_id()
    ))
  );

-- Policy: Admins can view all audit logs
CREATE POLICY "audit_logs_admin_access" ON "public"."audit_logs"
  FOR SELECT
  USING (
    public.current_user_role() = 'ADMIN'
  );

-- =============================================================================
-- STEP 9: Create service account role for system operations
-- =============================================================================

-- Create a role for service account operations (bypasses RLS)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'both_sides_service') THEN
    CREATE ROLE both_sides_service;
  END IF;
END
$$;

-- Grant necessary permissions to service role
GRANT USAGE ON SCHEMA "public" TO both_sides_service;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA "public" TO both_sides_service;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA "public" TO both_sides_service;

-- Create a function to check if current user is service account
CREATE OR REPLACE FUNCTION public.is_service_account()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    current_setting('app.bypass_rls', true)::boolean = true
    OR current_user = 'both_sides_service'
  );
EXCEPTION
  WHEN others THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- STEP 10: Add service account bypass policies to all tables
-- =============================================================================

-- Service account bypass for users
CREATE POLICY "users_service_bypass" ON "public"."users"
  FOR ALL
  USING (public.is_service_account())
  WITH CHECK (public.is_service_account());

-- Service account bypass for profiles
CREATE POLICY "profiles_service_bypass" ON "public"."profiles"
  FOR ALL
  USING (public.is_service_account())
  WITH CHECK (public.is_service_account());

-- Service account bypass for classes
CREATE POLICY "classes_service_bypass" ON "public"."classes"
  FOR ALL
  USING (public.is_service_account())
  WITH CHECK (public.is_service_account());

-- Service account bypass for enrollments
CREATE POLICY "enrollments_service_bypass" ON "public"."enrollments"
  FOR ALL
  USING (public.is_service_account())
  WITH CHECK (public.is_service_account());

-- Service account bypass for organizations
CREATE POLICY "organizations_service_bypass" ON "public"."organizations"
  FOR ALL
  USING (public.is_service_account())
  WITH CHECK (public.is_service_account());

-- Service account bypass for audit_logs
CREATE POLICY "audit_logs_service_bypass" ON "public"."audit_logs"
  FOR ALL
  USING (public.is_service_account())
  WITH CHECK (public.is_service_account());
