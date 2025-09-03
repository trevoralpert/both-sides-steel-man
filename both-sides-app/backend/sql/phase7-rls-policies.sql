-- Phase 7: Reflection & Learning System - Row-Level Security (RLS) Policies
-- Task 7.1.1: RLS policies for reflection and learning analytics tables

-- Enable RLS on all Phase 7 tables
ALTER TABLE reflections ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE reflection_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcript_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE debate_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE argument_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE reflection_attachments ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- REFLECTIONS TABLE POLICIES
-- =============================================================================

-- Students can only view/edit their own reflections
CREATE POLICY "students_own_reflections" ON reflections
  FOR ALL TO authenticated
  USING (
    user_id = auth.uid() 
    AND EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'STUDENT'
    )
  );

-- Teachers can view reflections from students in their classes
CREATE POLICY "teachers_class_reflections" ON reflections
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN classes c ON c.teacher_id = u.id
      JOIN enrollments e ON e.class_id = c.id
      WHERE u.id = auth.uid()
      AND u.role = 'TEACHER'
      AND e.user_id = reflections.user_id
      AND reflections.class_id = c.id
    )
  );

-- Admins can view all reflections
CREATE POLICY "admins_all_reflections" ON reflections
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'ADMIN'
    )
  );

-- =============================================================================
-- LEARNING ANALYTICS TABLE POLICIES
-- =============================================================================

-- Students can view their own analytics
CREATE POLICY "students_own_analytics" ON learning_analytics
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'STUDENT'
    )
  );

-- Teachers can view analytics for students in their classes
CREATE POLICY "teachers_class_analytics" ON learning_analytics
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN classes c ON c.teacher_id = u.id
      JOIN enrollments e ON e.class_id = c.id
      WHERE u.id = auth.uid()
      AND u.role = 'TEACHER'
      AND e.user_id = learning_analytics.user_id
      AND learning_analytics.class_id = c.id
    )
  );

-- System can insert/update analytics (for AI analysis services)
CREATE POLICY "system_analytics_write" ON learning_analytics
  FOR INSERT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('ADMIN', 'TEACHER')
    )
  );

-- Admins can view all analytics
CREATE POLICY "admins_all_analytics" ON learning_analytics
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'ADMIN'
    )
  );

-- =============================================================================
-- REFLECTION TEMPLATES TABLE POLICIES
-- =============================================================================

-- Anyone can read active templates (for reflection generation)
CREATE POLICY "read_active_templates" ON reflection_templates
  FOR SELECT TO authenticated
  USING (active_status = true);

-- Teachers can create/edit their own templates
CREATE POLICY "teachers_own_templates" ON reflection_templates
  FOR ALL TO authenticated
  USING (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'TEACHER'
    )
  );

-- Admins can manage all templates
CREATE POLICY "admins_all_templates" ON reflection_templates
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'ADMIN'
    )
  );

-- =============================================================================
-- AI ANALYSIS TABLES POLICIES (Transcript, Summaries, Arguments, Insights)
-- =============================================================================

-- Transcript Analyses: Teachers and students involved in the debate can view
CREATE POLICY "debate_participants_transcript_analyses" ON transcript_analyses
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations conv
      JOIN matches m ON m.id = conv.match_id
      WHERE (m.student1_id = auth.uid() OR m.student2_id = auth.uid())
      AND conv.id::text = transcript_analyses.debate_id
    )
    OR
    EXISTS (
      SELECT 1 FROM conversations conv
      JOIN matches m ON m.id = conv.match_id
      JOIN classes c ON c.id = m.class_id
      WHERE c.teacher_id = auth.uid()
      AND conv.id::text = transcript_analyses.debate_id
    )
  );

-- Debate Summaries: Same access as transcript analyses + user-specific filtering
CREATE POLICY "debate_summaries_access" ON debate_summaries
  FOR SELECT TO authenticated
  USING (
    -- User can see their own personalized summaries
    (user_id = auth.uid())
    OR
    -- Students can see general summaries for their debates
    (user_id IS NULL AND EXISTS (
      SELECT 1 FROM conversations conv
      JOIN matches m ON m.id = conv.match_id
      WHERE (m.student1_id = auth.uid() OR m.student2_id = auth.uid())
      AND conv.id::text = debate_summaries.debate_id
    ))
    OR
    -- Teachers can see all summaries for debates in their classes
    EXISTS (
      SELECT 1 FROM conversations conv
      JOIN matches m ON m.id = conv.match_id
      JOIN classes c ON c.id = m.class_id
      WHERE c.teacher_id = auth.uid()
      AND conv.id::text = debate_summaries.debate_id
    )
  );

-- Argument Analyses: Similar to summaries
CREATE POLICY "argument_analyses_access" ON argument_analyses
  FOR SELECT TO authenticated
  USING (
    -- User can see their own analyses
    (user_id = auth.uid())
    OR
    -- Students can see general analyses for their debates
    (user_id IS NULL AND EXISTS (
      SELECT 1 FROM conversations conv
      JOIN matches m ON m.id = conv.match_id
      WHERE (m.student1_id = auth.uid() OR m.student2_id = auth.uid())
      AND conv.id::text = argument_analyses.debate_id
    ))
    OR
    -- Teachers can see all analyses for debates in their classes
    EXISTS (
      SELECT 1 FROM conversations conv
      JOIN matches m ON m.id = conv.match_id
      JOIN classes c ON c.id = m.class_id
      WHERE c.teacher_id = auth.uid()
      AND conv.id::text = argument_analyses.debate_id
    )
  );

-- Learning Insights: User-specific only (always has user_id)
CREATE POLICY "learning_insights_access" ON learning_insights
  FOR SELECT TO authenticated
  USING (
    -- User can see their own insights
    (user_id = auth.uid())
    OR
    -- Teachers can see insights for students in their classes
    EXISTS (
      SELECT 1 FROM users u
      JOIN classes c ON c.teacher_id = u.id
      JOIN enrollments e ON e.class_id = c.id
      WHERE u.id = auth.uid()
      AND u.role = 'TEACHER'
      AND e.user_id = learning_insights.user_id
    )
  );

-- =============================================================================
-- REFLECTION ATTACHMENTS POLICIES
-- =============================================================================

-- Users can manage their own attachments
CREATE POLICY "own_reflection_attachments" ON reflection_attachments
  FOR ALL TO authenticated
  USING (owner_user_id = auth.uid());

-- Teachers can view attachments from students in their classes
CREATE POLICY "teachers_class_attachments" ON reflection_attachments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN classes c ON c.teacher_id = u.id
      JOIN enrollments e ON e.class_id = c.id
      WHERE u.id = auth.uid()
      AND u.role = 'TEACHER'
      AND e.user_id = reflection_attachments.owner_user_id
    )
  );

-- Admins can view all attachments
CREATE POLICY "admins_all_attachments" ON reflection_attachments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'ADMIN'
    )
  );

-- =============================================================================
-- SYSTEM SERVICE POLICIES (for AI analysis and background jobs)
-- =============================================================================

-- Allow system services to write AI analysis results
-- These would typically be executed with elevated privileges via service accounts

CREATE POLICY "system_write_transcript_analyses" ON transcript_analyses
  FOR INSERT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'ADMIN'
    )
  );

CREATE POLICY "system_write_debate_summaries" ON debate_summaries
  FOR INSERT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'ADMIN'
    )
  );

CREATE POLICY "system_write_argument_analyses" ON argument_analyses
  FOR INSERT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'ADMIN'
    )
  );

CREATE POLICY "system_write_learning_insights" ON learning_insights
  FOR INSERT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'ADMIN'
    )
  );

-- =============================================================================
-- UTILITY FUNCTIONS FOR RLS POLICIES
-- =============================================================================

-- Function to check if user is a teacher of a specific student
CREATE OR REPLACE FUNCTION is_teacher_of_student(teacher_id UUID, student_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM classes c
    JOIN enrollments e ON e.class_id = c.id
    WHERE c.teacher_id = teacher_id
    AND e.user_id = student_id
    AND e.enrollment_status = 'ACTIVE'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has access to a specific debate
CREATE OR REPLACE FUNCTION has_debate_access(user_id UUID, debate_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM conversations conv
    JOIN matches m ON m.id = conv.match_id
    WHERE conv.id::text = debate_id
    AND (
      -- User is a participant
      (m.student1_id = user_id OR m.student2_id = user_id)
      OR
      -- User is the teacher of the class
      EXISTS (
        SELECT 1 FROM classes c
        WHERE c.id = m.class_id
        AND c.teacher_id = user_id
      )
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- PERFORMANCE OPTIMIZATIONS
-- =============================================================================

-- Create additional indexes for RLS query optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reflections_user_class 
  ON reflections (user_id, class_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_learning_analytics_user_class 
  ON learning_analytics (user_id, class_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reflection_templates_active 
  ON reflection_templates (active_status, created_by);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_debate_summaries_user_type 
  ON debate_summaries (user_id, summary_type);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_learning_insights_user_priority 
  ON learning_insights (user_id, priority_level);

-- =============================================================================
-- GRANTS FOR SERVICE ROLES
-- =============================================================================

-- Grant necessary permissions for background job processing
-- These would be applied to specific service accounts

-- Example grants (would be customized for actual service accounts):
-- GRANT SELECT, INSERT, UPDATE ON transcript_analyses TO service_analyzer;
-- GRANT SELECT, INSERT, UPDATE ON debate_summaries TO service_analyzer;
-- GRANT SELECT, INSERT, UPDATE ON argument_analyses TO service_analyzer;
-- GRANT SELECT, INSERT, UPDATE ON learning_insights TO service_analyzer;
-- GRANT SELECT, INSERT, UPDATE ON learning_analytics TO service_analyzer;
