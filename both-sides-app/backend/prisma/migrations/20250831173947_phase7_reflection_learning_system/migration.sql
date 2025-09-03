-- Phase 7: Reflection & Learning System - Database Migration
-- Task 7.1.1: Database Schema Updates & Migrations

-- CreateEnum for ReflectionStatus
CREATE TYPE "ReflectionStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'INCOMPLETE');

-- CreateEnum for LearningMetricType
CREATE TYPE "LearningMetricType" AS ENUM ('ARGUMENT_QUALITY', 'CRITICAL_THINKING', 'COMMUNICATION_SKILLS', 'EMPATHY', 'ENGAGEMENT', 'KNOWLEDGE_RETENTION', 'POSITION_FLEXIBILITY', 'EVIDENCE_EVALUATION', 'LOGICAL_REASONING', 'ACTIVE_LISTENING');

-- CreateEnum for AnalysisStatus
CREATE TYPE "AnalysisStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CACHED');

-- CreateTable: reflections
CREATE TABLE "reflections" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "debate_id" TEXT NOT NULL,
    "class_id" TEXT,
    "reflection_data" JSONB NOT NULL,
    "completion_status" "ReflectionStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "progress_percentage" INTEGER NOT NULL DEFAULT 0,
    "total_questions" INTEGER,
    "completed_questions" INTEGER NOT NULL DEFAULT 0,
    "quality_score" DOUBLE PRECISION,
    "engagement_score" DOUBLE PRECISION,
    "time_spent_minutes" INTEGER,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "timeback_reflection_id" TEXT,
    "timeback_synced_at" TIMESTAMP(3),
    "timeback_sync_status" "TimeBackSyncStatus" DEFAULT 'PENDING',
    "timeback_sync_version" INTEGER DEFAULT 1,

    CONSTRAINT "reflections_pkey" PRIMARY KEY ("id")
);

-- CreateTable: learning_analytics
CREATE TABLE "learning_analytics" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "metric_type" "LearningMetricType" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "context" JSONB,
    "measurement_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "debate_id" TEXT,
    "class_id" TEXT,
    "comparison_baseline" DOUBLE PRECISION,
    "percentile_rank" DOUBLE PRECISION,
    "improvement_rate" DOUBLE PRECISION,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "timeback_analytic_id" TEXT,
    "timeback_synced_at" TIMESTAMP(3),
    "timeback_sync_status" "TimeBackSyncStatus" DEFAULT 'PENDING',
    "timeback_sync_version" INTEGER DEFAULT 1,

    CONSTRAINT "learning_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable: reflection_templates
CREATE TABLE "reflection_templates" (
    "id" TEXT NOT NULL,
    "template_type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "prompt_text" TEXT NOT NULL,
    "target_audience" TEXT NOT NULL,
    "question_type" TEXT NOT NULL,
    "options" JSONB,
    "difficulty_level" INTEGER NOT NULL DEFAULT 5,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "category" TEXT,
    "requires_context" BOOLEAN NOT NULL DEFAULT false,
    "active_status" BOOLEAN NOT NULL DEFAULT true,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "effectiveness_score" DOUBLE PRECISION,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "reflection_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable: transcript_analyses
CREATE TABLE "transcript_analyses" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "analysis_version" TEXT NOT NULL,
    "sentiment_data" JSONB,
    "topic_data" JSONB,
    "argument_data" JSONB,
    "linguistic_data" JSONB,
    "interaction_data" JSONB,
    "quality_data" JSONB,
    "status" "AnalysisStatus" NOT NULL DEFAULT 'PENDING',
    "processing_time_ms" INTEGER,
    "error_message" TEXT,
    "confidence_score" DOUBLE PRECISION,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transcript_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable: debate_summaries
CREATE TABLE "debate_summaries" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "summary_type" TEXT NOT NULL,
    "summary_version" TEXT NOT NULL,
    "status" "AnalysisStatus" NOT NULL DEFAULT 'PENDING',
    "processing_time_ms" INTEGER,
    "error_message" TEXT,
    "summary_data" JSONB NOT NULL,
    "key_points" JSONB,
    "resolution_attempts" JSONB,
    "common_ground" JSONB,
    "persistent_disagreements" JSONB,
    "debate_quality_score" DOUBLE PRECISION,
    "educational_value" DOUBLE PRECISION,
    "engagement_level" DOUBLE PRECISION,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "debate_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable: argument_analyses
CREATE TABLE "argument_analyses" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "analysis_version" TEXT NOT NULL,
    "participant_id" TEXT,
    "status" "AnalysisStatus" NOT NULL DEFAULT 'PENDING',
    "processing_time_ms" INTEGER,
    "error_message" TEXT,
    "arguments_data" JSONB,
    "evidence_data" JSONB,
    "reasoning_data" JSONB,
    "fallacy_data" JSONB,
    "argument_strength" DOUBLE PRECISION,
    "evidence_quality" DOUBLE PRECISION,
    "logical_coherence" DOUBLE PRECISION,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "argument_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable: learning_insights
CREATE TABLE "learning_insights" (
    "id" TEXT NOT NULL,
    "debate_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "insight_type" TEXT NOT NULL,
    "insight_version" TEXT NOT NULL,
    "status" "AnalysisStatus" NOT NULL DEFAULT 'PENDING',
    "processing_time_ms" INTEGER,
    "error_message" TEXT,
    "actionability_score" DOUBLE PRECISION,
    "relevance_score" DOUBLE PRECISION,
    "priority_level" TEXT,
    "payload" JSONB NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "learning_insights_pkey" PRIMARY KEY ("id")
);

-- CreateTable: reflection_attachments
CREATE TABLE "reflection_attachments" (
    "id" TEXT NOT NULL,
    "reflection_id" TEXT NOT NULL,
    "attachment_type" TEXT NOT NULL,
    "original_filename" TEXT,
    "file_path" TEXT,
    "file_size" INTEGER,
    "mime_type" TEXT,
    "upload_status" TEXT NOT NULL DEFAULT 'pending',
    "processing_status" TEXT,
    "duration_seconds" INTEGER,
    "transcript_text" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reflection_attachments_pkey" PRIMARY KEY ("id")
);

-- Create indexes for performance optimization

-- Reflections indexes
CREATE INDEX "reflections_user_id_idx" ON "reflections"("user_id");
CREATE INDEX "reflections_debate_id_idx" ON "reflections"("debate_id");
CREATE INDEX "reflections_class_id_idx" ON "reflections"("class_id");
CREATE INDEX "reflections_completion_status_idx" ON "reflections"("completion_status");
CREATE INDEX "reflections_created_at_idx" ON "reflections"("created_at");
CREATE INDEX "reflections_timeback_reflection_id_idx" ON "reflections"("timeback_reflection_id");

-- Learning analytics indexes
CREATE INDEX "learning_analytics_user_id_idx" ON "learning_analytics"("user_id");
CREATE INDEX "learning_analytics_metric_type_idx" ON "learning_analytics"("metric_type");
CREATE INDEX "learning_analytics_measurement_date_idx" ON "learning_analytics"("measurement_date");
CREATE INDEX "learning_analytics_debate_id_idx" ON "learning_analytics"("debate_id");
CREATE INDEX "learning_analytics_class_id_idx" ON "learning_analytics"("class_id");
CREATE INDEX "learning_analytics_user_id_metric_type_idx" ON "learning_analytics"("user_id", "metric_type");
CREATE INDEX "learning_analytics_timeback_analytic_id_idx" ON "learning_analytics"("timeback_analytic_id");

-- Reflection templates indexes
CREATE INDEX "reflection_templates_template_type_idx" ON "reflection_templates"("template_type");
CREATE INDEX "reflection_templates_target_audience_idx" ON "reflection_templates"("target_audience");
CREATE INDEX "reflection_templates_difficulty_level_idx" ON "reflection_templates"("difficulty_level");
CREATE INDEX "reflection_templates_active_status_idx" ON "reflection_templates"("active_status");
CREATE INDEX "reflection_templates_category_idx" ON "reflection_templates"("category");
CREATE INDEX "reflection_templates_created_by_idx" ON "reflection_templates"("created_by");

-- Transcript analyses indexes
CREATE INDEX "transcript_analyses_conversation_id_idx" ON "transcript_analyses"("conversation_id");
CREATE INDEX "transcript_analyses_user_id_idx" ON "transcript_analyses"("user_id");
CREATE INDEX "transcript_analyses_status_idx" ON "transcript_analyses"("status");
CREATE INDEX "transcript_analyses_created_at_idx" ON "transcript_analyses"("created_at");

-- Debate summaries indexes
CREATE INDEX "debate_summaries_conversation_id_idx" ON "debate_summaries"("conversation_id");
CREATE INDEX "debate_summaries_user_id_idx" ON "debate_summaries"("user_id");
CREATE INDEX "debate_summaries_status_idx" ON "debate_summaries"("status");
CREATE INDEX "debate_summaries_summary_type_idx" ON "debate_summaries"("summary_type");
CREATE INDEX "debate_summaries_created_at_idx" ON "debate_summaries"("created_at");

-- Argument analyses indexes
CREATE INDEX "argument_analyses_conversation_id_idx" ON "argument_analyses"("conversation_id");
CREATE INDEX "argument_analyses_user_id_idx" ON "argument_analyses"("user_id");
CREATE INDEX "argument_analyses_participant_id_idx" ON "argument_analyses"("participant_id");
CREATE INDEX "argument_analyses_status_idx" ON "argument_analyses"("status");
CREATE INDEX "argument_analyses_created_at_idx" ON "argument_analyses"("created_at");

-- Learning insights indexes
CREATE INDEX "learning_insights_debate_id_idx" ON "learning_insights"("debate_id");
CREATE INDEX "learning_insights_user_id_idx" ON "learning_insights"("user_id");
CREATE INDEX "learning_insights_insight_type_idx" ON "learning_insights"("insight_type");
CREATE INDEX "learning_insights_status_idx" ON "learning_insights"("status");
CREATE INDEX "learning_insights_priority_level_idx" ON "learning_insights"("priority_level");
CREATE INDEX "learning_insights_created_at_idx" ON "learning_insights"("created_at");

-- Reflection attachments indexes
CREATE INDEX "reflection_attachments_reflection_id_idx" ON "reflection_attachments"("reflection_id");
CREATE INDEX "reflection_attachments_attachment_type_idx" ON "reflection_attachments"("attachment_type");
CREATE INDEX "reflection_attachments_upload_status_idx" ON "reflection_attachments"("upload_status");
CREATE INDEX "reflection_attachments_created_at_idx" ON "reflection_attachments"("created_at");

-- Add unique constraints
CREATE UNIQUE INDEX "reflections_user_id_debate_id_key" ON "reflections"("user_id", "debate_id");
CREATE UNIQUE INDEX "transcript_analyses_conversation_id_key" ON "transcript_analyses"("conversation_id");

-- Add foreign key constraints (Note: Some tables like conversations may not exist yet)
-- Foreign keys will be added when the referenced tables are available

-- For now, we'll add the foreign keys that reference existing tables:
ALTER TABLE "reflections" ADD CONSTRAINT "reflections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "learning_analytics" ADD CONSTRAINT "learning_analytics_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "reflection_templates" ADD CONSTRAINT "reflection_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "transcript_analyses" ADD CONSTRAINT "transcript_analyses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "debate_summaries" ADD CONSTRAINT "debate_summaries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "argument_analyses" ADD CONSTRAINT "argument_analyses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "learning_insights" ADD CONSTRAINT "learning_insights_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "reflection_attachments" ADD CONSTRAINT "reflection_attachments_reflection_id_fkey" FOREIGN KEY ("reflection_id") REFERENCES "reflections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Note: Additional foreign keys for conversation_id, debate_id, class_id will be added 
-- when Phase 5 conversation tables are properly set up
