/*
  Warnings:

  - You are about to drop the column `survey_responses` on the `profiles` table. All the data in the column will be lost.

*/
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

-- AlterTable
ALTER TABLE "public"."profiles" DROP COLUMN "survey_responses",
ADD COLUMN     "legacy_survey_responses" JSONB;

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
