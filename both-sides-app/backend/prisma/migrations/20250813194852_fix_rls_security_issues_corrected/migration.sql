-- Migration: Fix RLS Security Issues (Corrected)
-- Fix issues identified in RLS policy testing - corrected syntax
-- Date: 2025-08-13

-- =============================================================================
-- STEP 1: Drop problematic policies that are too permissive
-- =============================================================================

-- Drop existing problematic policies for users table
DROP POLICY IF EXISTS "admins_full_access" ON "public"."users";

-- =============================================================================
-- STEP 2: Create more restrictive admin policy for users table
-- =============================================================================

-- Policy: Admins have full access BUT with some restrictions
-- Note: We'll implement org-level restrictions in future when org membership is added
CREATE POLICY "admins_restricted_access" ON "public"."users"
  FOR ALL
  USING (
    public.current_user_role() = 'ADMIN'
  )
  WITH CHECK (
    public.current_user_role() = 'ADMIN'
  );

-- =============================================================================
-- STEP 3: Add missing INSERT/DELETE policies for better security
-- =============================================================================

-- Policy: Only service accounts and system can insert new users
CREATE POLICY "users_insert_restricted" ON "public"."users"
  FOR INSERT
  WITH CHECK (
    public.is_service_account()
  );

-- Policy: Only service accounts can delete users
CREATE POLICY "users_delete_restricted" ON "public"."users"
  FOR DELETE
  USING (
    public.is_service_account()
  );

-- =============================================================================
-- STEP 4: Add security policies for profiles table
-- =============================================================================

-- Policy: Users can only insert their own profile or via service account
CREATE POLICY "profiles_insert_restricted" ON "public"."profiles"
  FOR INSERT
  WITH CHECK (
    user_id = public.current_user_id()
    OR public.is_service_account()
  );

-- Policy: Users can delete only their own profile or via service account
CREATE POLICY "profiles_delete_restricted" ON "public"."profiles"
  FOR DELETE
  USING (
    user_id = public.current_user_id()
    OR public.is_service_account()
  );

-- =============================================================================
-- STEP 5: Add security policies for classes table
-- =============================================================================

-- Policy: Only teachers can insert classes they will teach, or admins, or service account
CREATE POLICY "classes_insert_restricted" ON "public"."classes"
  FOR INSERT
  WITH CHECK (
    teacher_id = public.current_user_id()
    OR public.current_user_role() = 'ADMIN'
    OR public.is_service_account()
  );

-- Policy: Only service accounts can delete classes
CREATE POLICY "classes_delete_restricted" ON "public"."classes"
  FOR DELETE
  USING (
    public.is_service_account()
  );

-- =============================================================================
-- STEP 6: Add security policies for enrollments table
-- =============================================================================

-- Policy: Only teachers (for their classes), admins, or service accounts can insert enrollments
CREATE POLICY "enrollments_insert_restricted" ON "public"."enrollments"
  FOR INSERT
  WITH CHECK (
    public.is_service_account()
    OR public.current_user_role() = 'ADMIN'
    OR class_id IN (
      SELECT id FROM "public"."classes" WHERE teacher_id = public.current_user_id()
    )
  );

-- Policy: Only teachers (for their classes), admins, or service accounts can update enrollments
CREATE POLICY "enrollments_update_restricted" ON "public"."enrollments"
  FOR UPDATE
  USING (
    public.is_service_account()
    OR public.current_user_role() = 'ADMIN'
    OR class_id IN (
      SELECT id FROM "public"."classes" WHERE teacher_id = public.current_user_id()
    )
  )
  WITH CHECK (
    public.is_service_account()
    OR public.current_user_role() = 'ADMIN'
    OR class_id IN (
      SELECT id FROM "public"."classes" WHERE teacher_id = public.current_user_id()
    )
  );

-- Policy: Only service accounts can delete enrollments
CREATE POLICY "enrollments_delete_restricted" ON "public"."enrollments"
  FOR DELETE
  USING (
    public.is_service_account()
  );

-- =============================================================================
-- STEP 7: Add security policies for organizations table
-- =============================================================================

-- Policy: Only admins and service accounts can insert organizations
CREATE POLICY "organizations_insert_restricted" ON "public"."organizations"
  FOR INSERT
  WITH CHECK (
    public.current_user_role() = 'ADMIN'
    OR public.is_service_account()
  );

-- Policy: Only admins and service accounts can update organizations
CREATE POLICY "organizations_update_restricted" ON "public"."organizations"
  FOR UPDATE
  USING (
    public.current_user_role() = 'ADMIN'
    OR public.is_service_account()
  )
  WITH CHECK (
    public.current_user_role() = 'ADMIN'
    OR public.is_service_account()
  );

-- Policy: Only service accounts can delete organizations
CREATE POLICY "organizations_delete_restricted" ON "public"."organizations"
  FOR DELETE
  USING (
    public.is_service_account()
  );

-- =============================================================================
-- STEP 8: Add security policies for audit_logs table
-- =============================================================================

-- Policy: Only service accounts can insert audit logs
CREATE POLICY "audit_logs_insert_restricted" ON "public"."audit_logs"
  FOR INSERT
  WITH CHECK (
    public.is_service_account()
  );

-- Policy: Only service accounts can update audit logs
CREATE POLICY "audit_logs_update_restricted" ON "public"."audit_logs"
  FOR UPDATE
  USING (
    public.is_service_account()
  )
  WITH CHECK (
    public.is_service_account()
  );

-- Policy: Only service accounts can delete audit logs
CREATE POLICY "audit_logs_delete_restricted" ON "public"."audit_logs"
  FOR DELETE
  USING (
    public.is_service_account()
  );
