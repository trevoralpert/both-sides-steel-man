-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('STUDENT', 'TEACHER', 'ADMIN');

-- CreateEnum
CREATE TYPE "public"."TimeBackSyncStatus" AS ENUM ('PENDING', 'SYNCED', 'ERROR');

-- CreateEnum
CREATE TYPE "public"."OrganizationType" AS ENUM ('DISTRICT', 'SCHOOL', 'DEPARTMENT');

-- CreateEnum
CREATE TYPE "public"."EnrollmentStatus" AS ENUM ('PENDING', 'ACTIVE', 'COMPLETED', 'DROPPED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "public"."SurveyQuestionCategory" AS ENUM ('POLITICAL', 'SOCIAL', 'ECONOMIC', 'PHILOSOPHICAL', 'PERSONAL');

-- CreateEnum
CREATE TYPE "public"."SurveyQuestionType" AS ENUM ('LIKERT', 'BINARY', 'MULTIPLE_CHOICE', 'RANKING', 'SLIDER', 'TEXT');

-- CreateEnum
CREATE TYPE "public"."MilestoneType" AS ENUM ('SURVEY_STARTED', 'SECTION_COMPLETED', 'MILESTONE_25_PERCENT', 'MILESTONE_50_PERCENT', 'MILESTONE_75_PERCENT', 'SURVEY_COMPLETED', 'PROFILE_GENERATED', 'PROFILE_CONFIRMED');

-- CreateEnum
CREATE TYPE "public"."NotificationType" AS ENUM ('COMPLETION_CELEBRATION', 'PROGRESS_REMINDER', 'TEACHER_NOTIFICATION', 'FOLLOW_UP_SURVEY', 'RE_ENGAGEMENT');

-- CreateEnum
CREATE TYPE "public"."NotificationStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'FAILED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "public"."MatchStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "public"."DebatePosition" AS ENUM ('PRO', 'CON');

-- CreateEnum
CREATE TYPE "public"."MatchOutcome" AS ENUM ('COMPLETED', 'CANCELLED', 'NO_RESPONSE', 'EXPIRED');

-- CreateEnum
CREATE TYPE "public"."ConversationStatus" AS ENUM ('PREPARING', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."DebatePhase" AS ENUM ('PREPARATION', 'OPENING', 'DISCUSSION', 'REBUTTAL', 'CLOSING', 'REFLECTION');

-- CreateEnum
CREATE TYPE "public"."MessageContentType" AS ENUM ('TEXT', 'SYSTEM', 'MODERATION', 'COACHING');

-- CreateEnum
CREATE TYPE "public"."MessageStatus" AS ENUM ('SENT', 'DELIVERED', 'READ', 'MODERATED', 'DELETED');

-- CreateEnum
CREATE TYPE "public"."ModerationStatus" AS ENUM ('APPROVED', 'FLAGGED', 'BLOCKED', 'REVIEWED');

-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "clerk_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "first_name" TEXT,
    "last_name" TEXT,
    "username" TEXT,
    "avatar_url" TEXT,
    "role" "public"."UserRole" NOT NULL DEFAULT 'STUDENT',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "timeback_user_id" TEXT,
    "timeback_synced_at" TIMESTAMP(3),
    "timeback_sync_status" "public"."TimeBackSyncStatus" DEFAULT 'PENDING',
    "timeback_sync_version" INTEGER DEFAULT 1,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."profiles" (
    "id" TEXT NOT NULL,
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "completion_date" TIMESTAMP(3),
    "legacy_survey_responses" JSONB,
    "belief_summary" TEXT,
    "ideology_scores" JSONB,
    "opinion_plasticity" DOUBLE PRECISION DEFAULT 0.5,
    "profile_version" INTEGER NOT NULL DEFAULT 1,
    "last_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" "public"."OrganizationType" NOT NULL DEFAULT 'SCHOOL',
    "parent_id" TEXT,
    "billing_email" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "subscription_plan" TEXT DEFAULT 'free',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "timeback_org_id" TEXT,
    "timeback_synced_at" TIMESTAMP(3),
    "timeback_sync_status" "public"."TimeBackSyncStatus" DEFAULT 'PENDING',
    "timeback_sync_version" INTEGER DEFAULT 1,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."classes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "subject" TEXT,
    "grade_level" TEXT,
    "academic_year" TEXT NOT NULL,
    "term" TEXT,
    "max_students" INTEGER NOT NULL DEFAULT 30,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "organization_id" TEXT NOT NULL,
    "teacher_id" TEXT NOT NULL,
    "timeback_class_id" TEXT,
    "timeback_synced_at" TIMESTAMP(3),
    "timeback_sync_status" "public"."TimeBackSyncStatus" DEFAULT 'PENDING',
    "timeback_sync_version" INTEGER DEFAULT 1,

    CONSTRAINT "classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."enrollments" (
    "id" TEXT NOT NULL,
    "enrollment_status" "public"."EnrollmentStatus" NOT NULL DEFAULT 'PENDING',
    "enrolled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "dropped_at" TIMESTAMP(3),
    "final_grade" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "user_id" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,

    CONSTRAINT "enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."audit_logs" (
    "id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "changes" JSONB,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actor_id" TEXT,
    "actor_type" TEXT,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."surveys" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "surveys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."survey_questions" (
    "id" TEXT NOT NULL,
    "survey_id" TEXT NOT NULL,
    "section" TEXT,
    "order" INTEGER NOT NULL,
    "category" "public"."SurveyQuestionCategory" NOT NULL,
    "type" "public"."SurveyQuestionType" NOT NULL,
    "question" TEXT NOT NULL,
    "options" JSONB,
    "scale" JSONB,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "ideology_mapping" JSONB,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "randomize_within_sec" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "survey_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."survey_responses" (
    "id" TEXT NOT NULL,
    "profile_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "response_value" JSONB NOT NULL,
    "response_text" TEXT,
    "confidence_level" INTEGER,
    "completion_time" INTEGER NOT NULL DEFAULT 0,
    "responded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "survey_id" TEXT NOT NULL,
    "survey_version" INTEGER NOT NULL,

    CONSTRAINT "survey_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."survey_milestones" (
    "id" TEXT NOT NULL,
    "profile_id" TEXT NOT NULL,
    "milestone_type" "public"."MilestoneType" NOT NULL,
    "achieved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "section_name" TEXT,
    "percentage" INTEGER,
    "quality_score" DOUBLE PRECISION,
    "completion_time" INTEGER,
    "metadata" JSONB,

    CONSTRAINT "survey_milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."class_completion_stats" (
    "id" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,
    "survey_id" TEXT NOT NULL,
    "total_students" INTEGER NOT NULL DEFAULT 0,
    "students_started" INTEGER NOT NULL DEFAULT 0,
    "students_completed" INTEGER NOT NULL DEFAULT 0,
    "avg_completion_time" DOUBLE PRECISION,
    "avg_quality_score" DOUBLE PRECISION,
    "completion_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "last_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "calculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "section_completion" JSONB,

    CONSTRAINT "class_completion_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."completion_notifications" (
    "id" TEXT NOT NULL,
    "profile_id" TEXT,
    "teacher_id" TEXT,
    "notification_type" "public"."NotificationType" NOT NULL,
    "status" "public"."NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "scheduled_for" TIMESTAMP(3),
    "sent_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "completion_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."matches" (
    "id" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,
    "student1_id" TEXT NOT NULL,
    "student2_id" TEXT NOT NULL,
    "status" "public"."MatchStatus" NOT NULL DEFAULT 'PENDING',
    "match_quality_score" DOUBLE PRECISION,
    "topic_id" TEXT,
    "student1_position" "public"."DebatePosition",
    "student2_position" "public"."DebatePosition",
    "expires_at" TIMESTAMP(3),
    "match_metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."debate_topics" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "difficulty_level" INTEGER NOT NULL DEFAULT 5,
    "complexity_score" DOUBLE PRECISION,
    "pro_resources" JSONB,
    "con_resources" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "success_rate" DOUBLE PRECISION,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "debate_topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."match_history" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "matched_user_id" TEXT NOT NULL,
    "match_id" TEXT NOT NULL,
    "outcome" "public"."MatchOutcome" NOT NULL,
    "satisfaction_rating" INTEGER,
    "learning_rating" INTEGER,
    "quality_feedback" TEXT,
    "completion_time" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "match_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."match_responses" (
    "id" TEXT NOT NULL,
    "match_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "reason" TEXT,
    "responded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "match_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."conversations" (
    "id" TEXT NOT NULL,
    "match_id" TEXT NOT NULL,
    "status" "public"."ConversationStatus" NOT NULL DEFAULT 'PREPARING',
    "debate_phase" "public"."DebatePhase" NOT NULL DEFAULT 'PREPARATION',
    "phase_deadline" TIMESTAMP(3),
    "started_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),
    "conversation_metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."messages" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "content_type" "public"."MessageContentType" NOT NULL DEFAULT 'TEXT',
    "message_metadata" JSONB,
    "reply_to_id" TEXT,
    "status" "public"."MessageStatus" NOT NULL DEFAULT 'SENT',
    "moderation_status" "public"."ModerationStatus" NOT NULL DEFAULT 'APPROVED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "edited_at" TIMESTAMP(3),

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."debate_sessions" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "session_config" JSONB,
    "participant_states" JSONB,
    "phase_history" JSONB,
    "performance_metrics" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "debate_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."message_analyses" (
    "id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "results" JSONB NOT NULL,
    "action_recommended" TEXT NOT NULL,
    "processing_time" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "message_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."analysis_feedback" (
    "id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "analysis_id" TEXT NOT NULL,
    "feedback_type" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comments" TEXT,
    "provider_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analysis_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."moderation_results" (
    "id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "rule_triggered" TEXT NOT NULL,
    "auto_executed" BOOLEAN NOT NULL DEFAULT false,
    "appealable" BOOLEAN NOT NULL DEFAULT false,
    "executed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "executor_id" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "moderation_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."moderation_appeals" (
    "id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "moderation_result_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "additional_evidence" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewer_id" TEXT,
    "review_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "reviewed_at" TIMESTAMP(3),

    CONSTRAINT "moderation_appeals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."review_queue" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "analysis_results" JSONB,
    "appeal_id" TEXT,
    "queued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assigned_at" TIMESTAMP(3),
    "assigned_to" TEXT,
    "completed_at" TIMESTAMP(3),
    "resolution_notes" TEXT,

    CONSTRAINT "review_queue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."coaching_feedback" (
    "id" TEXT NOT NULL,
    "suggestion_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "rating" TEXT NOT NULL,
    "comments" TEXT,
    "was_acted_upon" BOOLEAN NOT NULL DEFAULT false,
    "quality_rating" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coaching_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."safety_incidents" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "message_id" TEXT,
    "conversation_id" TEXT,
    "user_id" TEXT,
    "reported_by" TEXT NOT NULL,
    "evidence" JSONB,
    "additional_context" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "assigned_to" TEXT,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "resolved_at" TIMESTAMP(3),
    "resolution" TEXT,

    CONSTRAINT "safety_incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."content_deletion_schedule" (
    "id" TEXT NOT NULL,
    "content_id" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "policy_id" TEXT NOT NULL,
    "scheduled_for" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "processed_at" TIMESTAMP(3),
    "error_message" TEXT,

    CONSTRAINT "content_deletion_schedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."content_access_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "content_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "purpose" TEXT,
    "metadata" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "accessed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_access_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."escalation_queue" (
    "id" TEXT NOT NULL,
    "incident_id" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "recipients" TEXT[],
    "scheduled_for" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "processed_at" TIMESTAMP(3),
    "error_message" TEXT,

    CONSTRAINT "escalation_queue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."safety_check_logs" (
    "id" TEXT NOT NULL,
    "content_id" TEXT NOT NULL,
    "user_age" INTEGER,
    "is_appropriate" BOOLEAN NOT NULL,
    "violations" TEXT[],
    "warnings" TEXT[],
    "confidence_score" DOUBLE PRECISION,
    "recommended_action" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "safety_check_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."data_anonymization_logs" (
    "id" TEXT NOT NULL,
    "content_id" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "has_minors" BOOLEAN NOT NULL DEFAULT false,
    "anonymized_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT NOT NULL,
    "fields_anonymized" TEXT[],
    "metadata" JSONB,

    CONSTRAINT "data_anonymization_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_clerk_id_key" ON "public"."users"("clerk_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "public"."users"("username");

-- CreateIndex
CREATE INDEX "users_timeback_user_id_idx" ON "public"."users"("timeback_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_user_id_key" ON "public"."profiles"("user_id");

-- CreateIndex
CREATE INDEX "profiles_is_completed_idx" ON "public"."profiles"("is_completed");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "public"."organizations"("slug");

-- CreateIndex
CREATE INDEX "organizations_timeback_org_id_idx" ON "public"."organizations"("timeback_org_id");

-- CreateIndex
CREATE INDEX "classes_organization_id_idx" ON "public"."classes"("organization_id");

-- CreateIndex
CREATE INDEX "classes_teacher_id_idx" ON "public"."classes"("teacher_id");

-- CreateIndex
CREATE INDEX "classes_timeback_class_id_idx" ON "public"."classes"("timeback_class_id");

-- CreateIndex
CREATE INDEX "enrollments_class_id_enrollment_status_idx" ON "public"."enrollments"("class_id", "enrollment_status");

-- CreateIndex
CREATE UNIQUE INDEX "enrollments_user_id_class_id_key" ON "public"."enrollments"("user_id", "class_id");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "public"."audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "public"."audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "surveys_is_active_version_idx" ON "public"."surveys"("is_active", "version");

-- CreateIndex
CREATE INDEX "survey_questions_survey_id_section_order_idx" ON "public"."survey_questions"("survey_id", "section", "order");

-- CreateIndex
CREATE INDEX "survey_questions_is_active_idx" ON "public"."survey_questions"("is_active");

-- CreateIndex
CREATE INDEX "survey_responses_profile_id_idx" ON "public"."survey_responses"("profile_id");

-- CreateIndex
CREATE INDEX "survey_responses_question_id_idx" ON "public"."survey_responses"("question_id");

-- CreateIndex
CREATE INDEX "survey_responses_survey_id_survey_version_idx" ON "public"."survey_responses"("survey_id", "survey_version");

-- CreateIndex
CREATE INDEX "survey_milestones_profile_id_milestone_type_idx" ON "public"."survey_milestones"("profile_id", "milestone_type");

-- CreateIndex
CREATE INDEX "survey_milestones_achieved_at_idx" ON "public"."survey_milestones"("achieved_at");

-- CreateIndex
CREATE UNIQUE INDEX "survey_milestones_profile_id_milestone_type_section_name_key" ON "public"."survey_milestones"("profile_id", "milestone_type", "section_name");

-- CreateIndex
CREATE INDEX "class_completion_stats_class_id_idx" ON "public"."class_completion_stats"("class_id");

-- CreateIndex
CREATE INDEX "class_completion_stats_completion_rate_idx" ON "public"."class_completion_stats"("completion_rate");

-- CreateIndex
CREATE UNIQUE INDEX "class_completion_stats_class_id_survey_id_key" ON "public"."class_completion_stats"("class_id", "survey_id");

-- CreateIndex
CREATE INDEX "completion_notifications_status_scheduled_for_idx" ON "public"."completion_notifications"("status", "scheduled_for");

-- CreateIndex
CREATE INDEX "completion_notifications_profile_id_idx" ON "public"."completion_notifications"("profile_id");

-- CreateIndex
CREATE INDEX "completion_notifications_teacher_id_idx" ON "public"."completion_notifications"("teacher_id");

-- CreateIndex
CREATE INDEX "completion_notifications_notification_type_idx" ON "public"."completion_notifications"("notification_type");

-- CreateIndex
CREATE INDEX "matches_class_id_idx" ON "public"."matches"("class_id");

-- CreateIndex
CREATE INDEX "matches_status_idx" ON "public"."matches"("status");

-- CreateIndex
CREATE INDEX "matches_student1_id_idx" ON "public"."matches"("student1_id");

-- CreateIndex
CREATE INDEX "matches_student2_id_idx" ON "public"."matches"("student2_id");

-- CreateIndex
CREATE INDEX "matches_topic_id_idx" ON "public"."matches"("topic_id");

-- CreateIndex
CREATE INDEX "matches_expires_at_idx" ON "public"."matches"("expires_at");

-- CreateIndex
CREATE INDEX "debate_topics_category_idx" ON "public"."debate_topics"("category");

-- CreateIndex
CREATE INDEX "debate_topics_difficulty_level_idx" ON "public"."debate_topics"("difficulty_level");

-- CreateIndex
CREATE INDEX "debate_topics_is_active_idx" ON "public"."debate_topics"("is_active");

-- CreateIndex
CREATE INDEX "debate_topics_created_by_idx" ON "public"."debate_topics"("created_by");

-- CreateIndex
CREATE INDEX "match_history_user_id_idx" ON "public"."match_history"("user_id");

-- CreateIndex
CREATE INDEX "match_history_matched_user_id_idx" ON "public"."match_history"("matched_user_id");

-- CreateIndex
CREATE INDEX "match_history_match_id_idx" ON "public"."match_history"("match_id");

-- CreateIndex
CREATE INDEX "match_history_outcome_idx" ON "public"."match_history"("outcome");

-- CreateIndex
CREATE INDEX "match_history_created_at_idx" ON "public"."match_history"("created_at");

-- CreateIndex
CREATE INDEX "match_responses_match_id_idx" ON "public"."match_responses"("match_id");

-- CreateIndex
CREATE INDEX "match_responses_user_id_idx" ON "public"."match_responses"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "match_responses_match_id_user_id_key" ON "public"."match_responses"("match_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "conversations_match_id_key" ON "public"."conversations"("match_id");

-- CreateIndex
CREATE INDEX "conversations_status_idx" ON "public"."conversations"("status");

-- CreateIndex
CREATE INDEX "conversations_debate_phase_idx" ON "public"."conversations"("debate_phase");

-- CreateIndex
CREATE INDEX "conversations_phase_deadline_idx" ON "public"."conversations"("phase_deadline");

-- CreateIndex
CREATE INDEX "conversations_match_id_status_idx" ON "public"."conversations"("match_id", "status");

-- CreateIndex
CREATE INDEX "messages_conversation_id_idx" ON "public"."messages"("conversation_id");

-- CreateIndex
CREATE INDEX "messages_user_id_idx" ON "public"."messages"("user_id");

-- CreateIndex
CREATE INDEX "messages_created_at_idx" ON "public"."messages"("created_at");

-- CreateIndex
CREATE INDEX "messages_status_idx" ON "public"."messages"("status");

-- CreateIndex
CREATE INDEX "messages_moderation_status_idx" ON "public"."messages"("moderation_status");

-- CreateIndex
CREATE INDEX "messages_reply_to_id_idx" ON "public"."messages"("reply_to_id");

-- CreateIndex
CREATE INDEX "messages_conversation_id_created_at_idx" ON "public"."messages"("conversation_id", "created_at");

-- CreateIndex
CREATE INDEX "messages_conversation_id_status_idx" ON "public"."messages"("conversation_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "debate_sessions_conversation_id_key" ON "public"."debate_sessions"("conversation_id");

-- CreateIndex
CREATE INDEX "debate_sessions_conversation_id_idx" ON "public"."debate_sessions"("conversation_id");

-- CreateIndex
CREATE INDEX "message_analyses_message_id_idx" ON "public"."message_analyses"("message_id");

-- CreateIndex
CREATE INDEX "message_analyses_conversation_id_idx" ON "public"."message_analyses"("conversation_id");

-- CreateIndex
CREATE INDEX "message_analyses_action_recommended_idx" ON "public"."message_analyses"("action_recommended");

-- CreateIndex
CREATE INDEX "message_analyses_created_at_idx" ON "public"."message_analyses"("created_at");

-- CreateIndex
CREATE INDEX "analysis_feedback_analysis_id_idx" ON "public"."analysis_feedback"("analysis_id");

-- CreateIndex
CREATE INDEX "analysis_feedback_provider_id_idx" ON "public"."analysis_feedback"("provider_id");

-- CreateIndex
CREATE INDEX "analysis_feedback_feedback_type_idx" ON "public"."analysis_feedback"("feedback_type");

-- CreateIndex
CREATE INDEX "analysis_feedback_created_at_idx" ON "public"."analysis_feedback"("created_at");

-- CreateIndex
CREATE INDEX "moderation_results_message_id_idx" ON "public"."moderation_results"("message_id");

-- CreateIndex
CREATE INDEX "moderation_results_action_idx" ON "public"."moderation_results"("action");

-- CreateIndex
CREATE INDEX "moderation_results_severity_idx" ON "public"."moderation_results"("severity");

-- CreateIndex
CREATE INDEX "moderation_results_auto_executed_idx" ON "public"."moderation_results"("auto_executed");

-- CreateIndex
CREATE INDEX "moderation_results_executed_at_idx" ON "public"."moderation_results"("executed_at");

-- CreateIndex
CREATE INDEX "moderation_appeals_message_id_idx" ON "public"."moderation_appeals"("message_id");

-- CreateIndex
CREATE INDEX "moderation_appeals_moderation_result_id_idx" ON "public"."moderation_appeals"("moderation_result_id");

-- CreateIndex
CREATE INDEX "moderation_appeals_user_id_idx" ON "public"."moderation_appeals"("user_id");

-- CreateIndex
CREATE INDEX "moderation_appeals_status_idx" ON "public"."moderation_appeals"("status");

-- CreateIndex
CREATE INDEX "moderation_appeals_created_at_idx" ON "public"."moderation_appeals"("created_at");

-- CreateIndex
CREATE INDEX "review_queue_type_idx" ON "public"."review_queue"("type");

-- CreateIndex
CREATE INDEX "review_queue_message_id_idx" ON "public"."review_queue"("message_id");

-- CreateIndex
CREATE INDEX "review_queue_conversation_id_idx" ON "public"."review_queue"("conversation_id");

-- CreateIndex
CREATE INDEX "review_queue_user_id_idx" ON "public"."review_queue"("user_id");

-- CreateIndex
CREATE INDEX "review_queue_priority_idx" ON "public"."review_queue"("priority");

-- CreateIndex
CREATE INDEX "review_queue_assigned_to_idx" ON "public"."review_queue"("assigned_to");

-- CreateIndex
CREATE INDEX "review_queue_queued_at_idx" ON "public"."review_queue"("queued_at");

-- CreateIndex
CREATE INDEX "coaching_feedback_suggestion_id_idx" ON "public"."coaching_feedback"("suggestion_id");

-- CreateIndex
CREATE INDEX "coaching_feedback_user_id_idx" ON "public"."coaching_feedback"("user_id");

-- CreateIndex
CREATE INDEX "coaching_feedback_rating_idx" ON "public"."coaching_feedback"("rating");

-- CreateIndex
CREATE INDEX "coaching_feedback_was_acted_upon_idx" ON "public"."coaching_feedback"("was_acted_upon");

-- CreateIndex
CREATE INDEX "coaching_feedback_created_at_idx" ON "public"."coaching_feedback"("created_at");

-- CreateIndex
CREATE INDEX "safety_incidents_type_idx" ON "public"."safety_incidents"("type");

-- CreateIndex
CREATE INDEX "safety_incidents_severity_idx" ON "public"."safety_incidents"("severity");

-- CreateIndex
CREATE INDEX "safety_incidents_status_idx" ON "public"."safety_incidents"("status");

-- CreateIndex
CREATE INDEX "safety_incidents_message_id_idx" ON "public"."safety_incidents"("message_id");

-- CreateIndex
CREATE INDEX "safety_incidents_conversation_id_idx" ON "public"."safety_incidents"("conversation_id");

-- CreateIndex
CREATE INDEX "safety_incidents_user_id_idx" ON "public"."safety_incidents"("user_id");

-- CreateIndex
CREATE INDEX "safety_incidents_reported_by_idx" ON "public"."safety_incidents"("reported_by");

-- CreateIndex
CREATE INDEX "safety_incidents_occurred_at_idx" ON "public"."safety_incidents"("occurred_at");

-- CreateIndex
CREATE INDEX "content_deletion_schedule_content_id_idx" ON "public"."content_deletion_schedule"("content_id");

-- CreateIndex
CREATE INDEX "content_deletion_schedule_content_type_idx" ON "public"."content_deletion_schedule"("content_type");

-- CreateIndex
CREATE INDEX "content_deletion_schedule_policy_id_idx" ON "public"."content_deletion_schedule"("policy_id");

-- CreateIndex
CREATE INDEX "content_deletion_schedule_scheduled_for_idx" ON "public"."content_deletion_schedule"("scheduled_for");

-- CreateIndex
CREATE INDEX "content_deletion_schedule_status_idx" ON "public"."content_deletion_schedule"("status");

-- CreateIndex
CREATE INDEX "content_deletion_schedule_created_at_idx" ON "public"."content_deletion_schedule"("created_at");

-- CreateIndex
CREATE INDEX "content_access_logs_user_id_idx" ON "public"."content_access_logs"("user_id");

-- CreateIndex
CREATE INDEX "content_access_logs_content_id_idx" ON "public"."content_access_logs"("content_id");

-- CreateIndex
CREATE INDEX "content_access_logs_action_idx" ON "public"."content_access_logs"("action");

-- CreateIndex
CREATE INDEX "content_access_logs_accessed_at_idx" ON "public"."content_access_logs"("accessed_at");

-- CreateIndex
CREATE INDEX "escalation_queue_incident_id_idx" ON "public"."escalation_queue"("incident_id");

-- CreateIndex
CREATE INDEX "escalation_queue_level_idx" ON "public"."escalation_queue"("level");

-- CreateIndex
CREATE INDEX "escalation_queue_scheduled_for_idx" ON "public"."escalation_queue"("scheduled_for");

-- CreateIndex
CREATE INDEX "escalation_queue_status_idx" ON "public"."escalation_queue"("status");

-- CreateIndex
CREATE INDEX "escalation_queue_created_at_idx" ON "public"."escalation_queue"("created_at");

-- CreateIndex
CREATE INDEX "safety_check_logs_content_id_idx" ON "public"."safety_check_logs"("content_id");

-- CreateIndex
CREATE INDEX "safety_check_logs_user_age_idx" ON "public"."safety_check_logs"("user_age");

-- CreateIndex
CREATE INDEX "safety_check_logs_is_appropriate_idx" ON "public"."safety_check_logs"("is_appropriate");

-- CreateIndex
CREATE INDEX "safety_check_logs_created_at_idx" ON "public"."safety_check_logs"("created_at");

-- CreateIndex
CREATE INDEX "data_anonymization_logs_content_id_idx" ON "public"."data_anonymization_logs"("content_id");

-- CreateIndex
CREATE INDEX "data_anonymization_logs_content_type_idx" ON "public"."data_anonymization_logs"("content_type");

-- CreateIndex
CREATE INDEX "data_anonymization_logs_has_minors_idx" ON "public"."data_anonymization_logs"("has_minors");

-- CreateIndex
CREATE INDEX "data_anonymization_logs_anonymized_at_idx" ON "public"."data_anonymization_logs"("anonymized_at");

-- AddForeignKey
ALTER TABLE "public"."profiles" ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."organizations" ADD CONSTRAINT "organizations_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."classes" ADD CONSTRAINT "classes_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."classes" ADD CONSTRAINT "classes_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."enrollments" ADD CONSTRAINT "enrollments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."enrollments" ADD CONSTRAINT "enrollments_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."survey_questions" ADD CONSTRAINT "survey_questions_survey_id_fkey" FOREIGN KEY ("survey_id") REFERENCES "public"."surveys"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."survey_responses" ADD CONSTRAINT "survey_responses_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."survey_responses" ADD CONSTRAINT "survey_responses_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."survey_questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."survey_responses" ADD CONSTRAINT "survey_responses_survey_id_fkey" FOREIGN KEY ("survey_id") REFERENCES "public"."surveys"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."survey_milestones" ADD CONSTRAINT "survey_milestones_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."class_completion_stats" ADD CONSTRAINT "class_completion_stats_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."class_completion_stats" ADD CONSTRAINT "class_completion_stats_survey_id_fkey" FOREIGN KEY ("survey_id") REFERENCES "public"."surveys"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."completion_notifications" ADD CONSTRAINT "completion_notifications_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."completion_notifications" ADD CONSTRAINT "completion_notifications_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."matches" ADD CONSTRAINT "matches_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."matches" ADD CONSTRAINT "matches_student1_id_fkey" FOREIGN KEY ("student1_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."matches" ADD CONSTRAINT "matches_student2_id_fkey" FOREIGN KEY ("student2_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."matches" ADD CONSTRAINT "matches_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "public"."debate_topics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."debate_topics" ADD CONSTRAINT "debate_topics_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."match_history" ADD CONSTRAINT "match_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."match_history" ADD CONSTRAINT "match_history_matched_user_id_fkey" FOREIGN KEY ("matched_user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."match_history" ADD CONSTRAINT "match_history_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."match_responses" ADD CONSTRAINT "match_responses_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."match_responses" ADD CONSTRAINT "match_responses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."conversations" ADD CONSTRAINT "conversations_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."messages" ADD CONSTRAINT "messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."messages" ADD CONSTRAINT "messages_reply_to_id_fkey" FOREIGN KEY ("reply_to_id") REFERENCES "public"."messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."debate_sessions" ADD CONSTRAINT "debate_sessions_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."message_analyses" ADD CONSTRAINT "message_analyses_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."message_analyses" ADD CONSTRAINT "message_analyses_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."analysis_feedback" ADD CONSTRAINT "analysis_feedback_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."analysis_feedback" ADD CONSTRAINT "analysis_feedback_analysis_id_fkey" FOREIGN KEY ("analysis_id") REFERENCES "public"."message_analyses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."analysis_feedback" ADD CONSTRAINT "analysis_feedback_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."moderation_results" ADD CONSTRAINT "moderation_results_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."moderation_appeals" ADD CONSTRAINT "moderation_appeals_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."moderation_appeals" ADD CONSTRAINT "moderation_appeals_moderation_result_id_fkey" FOREIGN KEY ("moderation_result_id") REFERENCES "public"."moderation_results"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."moderation_appeals" ADD CONSTRAINT "moderation_appeals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."moderation_appeals" ADD CONSTRAINT "moderation_appeals_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."review_queue" ADD CONSTRAINT "review_queue_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."review_queue" ADD CONSTRAINT "review_queue_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."review_queue" ADD CONSTRAINT "review_queue_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."review_queue" ADD CONSTRAINT "review_queue_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."coaching_feedback" ADD CONSTRAINT "coaching_feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

