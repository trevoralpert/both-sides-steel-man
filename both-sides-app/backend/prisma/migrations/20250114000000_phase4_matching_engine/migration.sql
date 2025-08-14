-- Phase 4: Matching Engine & Debate Setup - Database Migration
-- Task 4.1.1: Database Schema Design & Implementation

-- CreateEnum for MatchStatus
CREATE TYPE "MatchStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'EXPIRED');

-- CreateEnum for DebatePosition  
CREATE TYPE "DebatePosition" AS ENUM ('PRO', 'CON');

-- CreateEnum for MatchOutcome
CREATE TYPE "MatchOutcome" AS ENUM ('COMPLETED', 'CANCELLED', 'NO_RESPONSE', 'EXPIRED');

-- CreateTable: matches
CREATE TABLE "matches" (
    "id" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,
    "student1_id" TEXT NOT NULL,
    "student2_id" TEXT NOT NULL,
    "status" "MatchStatus" NOT NULL DEFAULT 'PENDING',
    "match_quality_score" DOUBLE PRECISION,
    "topic_id" TEXT,
    "student1_position" "DebatePosition",
    "student2_position" "DebatePosition",
    "expires_at" TIMESTAMP(3),
    "match_metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable: debate_topics
CREATE TABLE "debate_topics" (
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

-- CreateTable: match_history
CREATE TABLE "match_history" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "matched_user_id" TEXT NOT NULL,
    "match_id" TEXT NOT NULL,
    "outcome" "MatchOutcome" NOT NULL,
    "satisfaction_rating" INTEGER,
    "learning_rating" INTEGER,
    "quality_feedback" TEXT,
    "completion_time" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "match_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable: match_responses
CREATE TABLE "match_responses" (
    "id" TEXT NOT NULL,
    "match_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "reason" TEXT,
    "responded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "match_responses_pkey" PRIMARY KEY ("id")
);

-- Create Indexes for performance optimization
CREATE INDEX "matches_class_id_idx" ON "matches"("class_id");
CREATE INDEX "matches_status_idx" ON "matches"("status");
CREATE INDEX "matches_student1_id_idx" ON "matches"("student1_id");
CREATE INDEX "matches_student2_id_idx" ON "matches"("student2_id");
CREATE INDEX "matches_topic_id_idx" ON "matches"("topic_id");
CREATE INDEX "matches_expires_at_idx" ON "matches"("expires_at");

CREATE INDEX "debate_topics_category_idx" ON "debate_topics"("category");
CREATE INDEX "debate_topics_difficulty_level_idx" ON "debate_topics"("difficulty_level");
CREATE INDEX "debate_topics_is_active_idx" ON "debate_topics"("is_active");
CREATE INDEX "debate_topics_created_by_idx" ON "debate_topics"("created_by");

CREATE INDEX "match_history_user_id_idx" ON "match_history"("user_id");
CREATE INDEX "match_history_matched_user_id_idx" ON "match_history"("matched_user_id");
CREATE INDEX "match_history_match_id_idx" ON "match_history"("match_id");
CREATE INDEX "match_history_outcome_idx" ON "match_history"("outcome");
CREATE INDEX "match_history_created_at_idx" ON "match_history"("created_at");

CREATE INDEX "match_responses_match_id_idx" ON "match_responses"("match_id");
CREATE INDEX "match_responses_user_id_idx" ON "match_responses"("user_id");

-- Add unique constraints
CREATE UNIQUE INDEX "match_responses_match_id_user_id_key" ON "match_responses"("match_id", "user_id");

-- Add foreign key constraints
ALTER TABLE "matches" ADD CONSTRAINT "matches_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "matches" ADD CONSTRAINT "matches_student1_id_fkey" FOREIGN KEY ("student1_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "matches" ADD CONSTRAINT "matches_student2_id_fkey" FOREIGN KEY ("student2_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "matches" ADD CONSTRAINT "matches_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "debate_topics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "debate_topics" ADD CONSTRAINT "debate_topics_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "match_history" ADD CONSTRAINT "match_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "match_history" ADD CONSTRAINT "match_history_matched_user_id_fkey" FOREIGN KEY ("matched_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "match_history" ADD CONSTRAINT "match_history_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "match_responses" ADD CONSTRAINT "match_responses_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "match_responses" ADD CONSTRAINT "match_responses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
