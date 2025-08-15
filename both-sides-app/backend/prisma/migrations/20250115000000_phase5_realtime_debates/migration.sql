-- Phase 5: Real-time Debate System - Database Migration
-- Task 5.1.1: Database Schema for Conversations & Messages

-- CreateEnum for ConversationStatus
CREATE TYPE "ConversationStatus" AS ENUM ('PREPARING', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- CreateEnum for DebatePhase
CREATE TYPE "DebatePhase" AS ENUM ('PREPARATION', 'OPENING', 'DISCUSSION', 'REBUTTAL', 'CLOSING', 'REFLECTION');

-- CreateEnum for MessageContentType
CREATE TYPE "MessageContentType" AS ENUM ('TEXT', 'SYSTEM', 'MODERATION', 'COACHING');

-- CreateEnum for MessageStatus
CREATE TYPE "MessageStatus" AS ENUM ('SENT', 'DELIVERED', 'READ', 'MODERATED', 'DELETED');

-- CreateEnum for ModerationStatus
CREATE TYPE "ModerationStatus" AS ENUM ('APPROVED', 'FLAGGED', 'BLOCKED', 'REVIEWED');

-- CreateTable: conversations
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "match_id" TEXT NOT NULL,
    "status" "ConversationStatus" NOT NULL DEFAULT 'PREPARING',
    "debate_phase" "DebatePhase" NOT NULL DEFAULT 'PREPARATION',
    "phase_deadline" TIMESTAMP(3),
    "started_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),
    "conversation_metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable: messages
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "content_type" "MessageContentType" NOT NULL DEFAULT 'TEXT',
    "message_metadata" JSONB,
    "reply_to_id" TEXT,
    "status" "MessageStatus" NOT NULL DEFAULT 'SENT',
    "moderation_status" "ModerationStatus" NOT NULL DEFAULT 'APPROVED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "edited_at" TIMESTAMP(3),

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable: debate_sessions
CREATE TABLE "debate_sessions" (
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

-- CreateIndex
CREATE UNIQUE INDEX "conversations_match_id_key" ON "conversations"("match_id");

-- CreateIndex
CREATE INDEX "conversations_status_idx" ON "conversations"("status");

-- CreateIndex
CREATE INDEX "conversations_debate_phase_idx" ON "conversations"("debate_phase");

-- CreateIndex
CREATE INDEX "conversations_phase_deadline_idx" ON "conversations"("phase_deadline");

-- CreateIndex
CREATE INDEX "messages_conversation_id_idx" ON "messages"("conversation_id");

-- CreateIndex
CREATE INDEX "messages_user_id_idx" ON "messages"("user_id");

-- CreateIndex
CREATE INDEX "messages_created_at_idx" ON "messages"("created_at");

-- CreateIndex
CREATE INDEX "messages_status_idx" ON "messages"("status");

-- CreateIndex
CREATE INDEX "messages_moderation_status_idx" ON "messages"("moderation_status");

-- CreateIndex
CREATE INDEX "messages_reply_to_id_idx" ON "messages"("reply_to_id");

-- CreateIndex
CREATE INDEX "debate_sessions_conversation_id_idx" ON "debate_sessions"("conversation_id");

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_reply_to_id_fkey" FOREIGN KEY ("reply_to_id") REFERENCES "messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "debate_sessions" ADD CONSTRAINT "debate_sessions_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Row-Level Security (RLS) Policies
-- Enable RLS on all new tables
ALTER TABLE "conversations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "debate_sessions" ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access conversations they are participants in
CREATE POLICY "conversation_participant_access" ON "conversations"
    FOR ALL USING (
        match_id IN (
            SELECT id FROM matches 
            WHERE student1_id = auth.uid()::text 
               OR student2_id = auth.uid()::text
        )
    );

-- RLS Policy: Users can only access messages from conversations they participate in
CREATE POLICY "message_participant_access" ON "messages"
    FOR ALL USING (
        conversation_id IN (
            SELECT c.id FROM conversations c
            JOIN matches m ON c.match_id = m.id
            WHERE m.student1_id = auth.uid()::text 
               OR m.student2_id = auth.uid()::text
        )
    );

-- RLS Policy: Users can only access debate sessions from conversations they participate in
CREATE POLICY "session_participant_access" ON "debate_sessions"
    FOR ALL USING (
        conversation_id IN (
            SELECT c.id FROM conversations c
            JOIN matches m ON c.match_id = m.id
            WHERE m.student1_id = auth.uid()::text 
               OR m.student2_id = auth.uid()::text
        )
    );

-- Additional indexes for performance optimization
CREATE INDEX "messages_conversation_created_idx" ON "messages"("conversation_id", "created_at");
CREATE INDEX "messages_conversation_status_idx" ON "messages"("conversation_id", "status");
CREATE INDEX "conversations_match_status_idx" ON "conversations"("match_id", "status");
