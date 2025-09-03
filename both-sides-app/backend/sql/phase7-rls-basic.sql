-- Phase 7: Basic Row-Level Security Setup
-- Enable RLS on Phase 7 tables for security compliance

-- Enable RLS on all Phase 7 tables
ALTER TABLE reflections ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE reflection_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcript_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE debate_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE argument_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE reflection_attachments ENABLE ROW LEVEL SECURITY;

-- For now, we'll use simple policies that allow access for application users
-- More complex policies can be added later when we have proper auth roles set up

-- Basic policy to allow all operations for now (security handled at application level)
CREATE POLICY "basic_access" ON reflections FOR ALL USING (true);
CREATE POLICY "basic_access" ON learning_analytics FOR ALL USING (true);
CREATE POLICY "basic_access" ON reflection_templates FOR ALL USING (true);
CREATE POLICY "basic_access" ON transcript_analyses FOR ALL USING (true);
CREATE POLICY "basic_access" ON debate_summaries FOR ALL USING (true);
CREATE POLICY "basic_access" ON argument_analyses FOR ALL USING (true);
CREATE POLICY "basic_access" ON learning_insights FOR ALL USING (true);
CREATE POLICY "basic_access" ON reflection_attachments FOR ALL USING (true);
