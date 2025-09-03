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

