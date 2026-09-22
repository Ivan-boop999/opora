-- AlterTable
ALTER TABLE "users" ADD COLUMN     "telegram_id" TEXT,
ADD COLUMN     "telegram_photo_url" TEXT,
ADD COLUMN     "telegram_username" TEXT;

-- CreateTable
CREATE TABLE "user_preferences" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "user_id" UUID NOT NULL,
    "theme" TEXT NOT NULL DEFAULT 'system',
    "reduce_motion" BOOLEAN NOT NULL DEFAULT false,
    "sound_enabled" BOOLEAN NOT NULL DEFAULT false,
    "haptics_enabled" BOOLEAN NOT NULL DEFAULT true,
    "language" TEXT NOT NULL DEFAULT 'ru',
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Moscow',
    "country" TEXT,
    "pace_preset" TEXT NOT NULL DEFAULT 'varied',
    "restrictions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "gamification_visible" BOOLEAN NOT NULL DEFAULT true,
    "onboarding_state" JSONB NOT NULL DEFAULT '{}',
    "onboarding_done_at" TIMESTAMP(3),
    "evening_time_minutes" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_consents" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "user_id" UUID NOT NULL,
    "purpose" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "check_ins" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "user_id" UUID NOT NULL,
    "mood" INTEGER,
    "energy" INTEGER,
    "tension" INTEGER,
    "emotions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "context" TEXT,
    "sleep_quality" INTEGER,
    "sleep_hours" DOUBLE PRECISION,
    "note" TEXT,
    "need" TEXT,
    "date_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "check_ins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "practices" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "code" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "practices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "practice_versions" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "practice_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "estimated_minutes" INTEGER NOT NULL,
    "effort" TEXT NOT NULL,
    "contexts" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "requirements" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "exclusions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "steps" JSONB NOT NULL,
    "easier_variant" TEXT NOT NULL,
    "alternative_codes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "stop_guidance" TEXT,
    "source_notes" TEXT,
    "review_status" TEXT NOT NULL DEFAULT 'draft',
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "practice_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "practice_favorites" (
    "user_id" UUID NOT NULL,
    "practice_code" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "practice_favorites_pkey" PRIMARY KEY ("user_id","practice_code")
);

-- CreateTable
CREATE TABLE "practice_exclusions" (
    "user_id" UUID NOT NULL,
    "practice_code" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "practice_exclusions_pkey" PRIMARY KEY ("user_id","practice_code")
);

-- CreateTable
CREATE TABLE "recommendations" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "user_id" UUID NOT NULL,
    "practice_code" TEXT NOT NULL,
    "rules_version" TEXT NOT NULL,
    "need" TEXT,
    "minutes_available" INTEGER,
    "reason" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "practice_sessions" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "user_id" UUID NOT NULL,
    "practice_code" TEXT NOT NULL,
    "practice_version" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'started',
    "mode" TEXT NOT NULL DEFAULT 'normal',
    "source" TEXT NOT NULL DEFAULT 'manual',
    "date_key" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "duration_seconds" INTEGER,

    CONSTRAINT "practice_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "practice_feedback" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "session_id" UUID NOT NULL,
    "tried" TEXT NOT NULL,
    "effect" TEXT NOT NULL,
    "feasible" TEXT NOT NULL,
    "comment" TEXT,
    "complaint" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "practice_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "routines" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "user_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "practice_code" TEXT,
    "customSteps" JSONB,
    "easier_variant" TEXT,
    "time_of_day" TEXT NOT NULL DEFAULT 'day',
    "time_minutes" INTEGER,
    "weekdays" INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5, 6, 7]::INTEGER[],
    "optional" BOOLEAN NOT NULL DEFAULT true,
    "category" TEXT,
    "start_date_key" TEXT NOT NULL,
    "paused_at" TIMESTAMP(3),
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "routines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "routine_occurrences" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "routine_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "date_key" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "routine_occurrences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "programs" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "code" TEXT NOT NULL,

    CONSTRAINT "programs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "program_versions" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "program_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "days_count" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "program_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "program_days" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "program_version_id" UUID NOT NULL,
    "day_number" INTEGER NOT NULL,
    "intro" TEXT NOT NULL,
    "practice_code" TEXT,
    "alternative_practice_code" TEXT,
    "customStep" JSONB,
    "question" TEXT,

    CONSTRAINT "program_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "program_enrollments" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "user_id" UUID NOT NULL,
    "program_version_id" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "current_day" INTEGER NOT NULL DEFAULT 1,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_activity_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "program_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "program_day_logs" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "enrollment_id" UUID NOT NULL,
    "day_number" INTEGER NOT NULL,
    "date_key" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "completed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "program_day_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "focus_sessions" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "user_id" UUID NOT NULL,
    "intention" TEXT NOT NULL,
    "planned_minutes" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),
    "marks" JSONB NOT NULL DEFAULT '[]',
    "elapsed_seconds" INTEGER NOT NULL DEFAULT 0,
    "date_key" TEXT NOT NULL,

    CONSTRAINT "focus_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sleep_entries" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "user_id" UUID NOT NULL,
    "date_key" TEXT NOT NULL,
    "quality" INTEGER NOT NULL,
    "bed_at" TEXT,
    "wake_at" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sleep_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_entries" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "user_id" UUID NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'free',
    "template_key" TEXT,
    "body" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_favorite" BOOLEAN NOT NULL DEFAULT false,
    "is_draft" BOOLEAN NOT NULL DEFAULT false,
    "edit_version" INTEGER NOT NULL DEFAULT 1,
    "check_in_id" UUID,
    "session_code" TEXT,
    "date_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "journal_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gardens" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "user_id" UUID NOT NULL,
    "scene" TEXT NOT NULL DEFAULT 'day',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gardens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "garden_plants" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "garden_id" UUID NOT NULL,
    "species" TEXT NOT NULL,
    "stage" INTEGER NOT NULL DEFAULT 1,
    "name" TEXT,
    "slot" INTEGER NOT NULL,
    "planted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "grown_at" TIMESTAMP(3),
    "retired_at" TIMESTAMP(3),

    CONSTRAINT "garden_plants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reward_ledger" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "user_id" UUID NOT NULL,
    "basis" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "drops" INTEGER NOT NULL,
    "date_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reward_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "achievements" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "user_id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "unlocked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "user_id" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "time_minutes" INTEGER NOT NULL DEFAULT 600,
    "weekdays" INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5, 6, 7]::INTEGER[],
    "quiet_from_minutes" INTEGER NOT NULL DEFAULT 0,
    "quiet_to_minutes" INTEGER NOT NULL DEFAULT 420,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_jobs" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "user_id" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "next_run_at" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "last_attempt_at" TIMESTAMP(3),
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_resources" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "country" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "org_url" TEXT NOT NULL,
    "contacts" JSONB NOT NULL,
    "hours" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_resources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_events" (
    "id" BIGSERIAL NOT NULL,
    "user_id" UUID,
    "name" TEXT NOT NULL,
    "props" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_audit_logs" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "actor_id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_preferences_user_id_key" ON "user_preferences"("user_id");

-- CreateIndex
CREATE INDEX "user_consents_user_idx" ON "user_consents"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_consents_user_id_purpose_key" ON "user_consents"("user_id", "purpose");

-- CreateIndex
CREATE INDEX "check_ins_user_created_at_idx" ON "check_ins"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "check_ins_user_date_key_idx" ON "check_ins"("user_id", "date_key");

-- CreateIndex
CREATE UNIQUE INDEX "practices_code_key" ON "practices"("code");

-- CreateIndex
CREATE INDEX "practice_versions_status_category_idx" ON "practice_versions"("review_status", "category");

-- CreateIndex
CREATE UNIQUE INDEX "practice_versions_practice_id_version_key" ON "practice_versions"("practice_id", "version");

-- CreateIndex
CREATE INDEX "recommendations_user_created_at_idx" ON "recommendations"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "practice_sessions_user_date_key_idx" ON "practice_sessions"("user_id", "date_key");

-- CreateIndex
CREATE INDEX "practice_sessions_user_status_idx" ON "practice_sessions"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "practice_feedback_session_id_key" ON "practice_feedback"("session_id");

-- CreateIndex
CREATE INDEX "routines_user_archived_at_idx" ON "routines"("user_id", "archived_at");

-- CreateIndex
CREATE INDEX "routine_occurrences_user_date_key_idx" ON "routine_occurrences"("user_id", "date_key");

-- CreateIndex
CREATE UNIQUE INDEX "routine_occurrences_routine_date_key" ON "routine_occurrences"("routine_id", "date_key");

-- CreateIndex
CREATE UNIQUE INDEX "programs_code_key" ON "programs"("code");

-- CreateIndex
CREATE UNIQUE INDEX "program_versions_program_id_version_key" ON "program_versions"("program_id", "version");

-- CreateIndex
CREATE UNIQUE INDEX "program_days_version_day_key" ON "program_days"("program_version_id", "day_number");

-- CreateIndex
CREATE INDEX "program_enrollments_user_status_idx" ON "program_enrollments"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "program_day_logs_enrollment_day_key" ON "program_day_logs"("enrollment_id", "day_number");

-- CreateIndex
CREATE INDEX "focus_sessions_user_started_at_idx" ON "focus_sessions"("user_id", "started_at");

-- CreateIndex
CREATE UNIQUE INDEX "sleep_entries_user_date_key_key" ON "sleep_entries"("user_id", "date_key");

-- CreateIndex
CREATE INDEX "journal_entries_user_updated_at_idx" ON "journal_entries"("user_id", "updated_at");

-- CreateIndex
CREATE INDEX "journal_entries_user_date_key_idx" ON "journal_entries"("user_id", "date_key");

-- CreateIndex
CREATE UNIQUE INDEX "gardens_user_id_key" ON "gardens"("user_id");

-- CreateIndex
CREATE INDEX "garden_plants_garden_slot_idx" ON "garden_plants"("garden_id", "slot");

-- CreateIndex
CREATE UNIQUE INDEX "reward_ledger_basis_key" ON "reward_ledger"("basis");

-- CreateIndex
CREATE INDEX "reward_ledger_user_date_key_idx" ON "reward_ledger"("user_id", "date_key");

-- CreateIndex
CREATE UNIQUE INDEX "achievements_user_key_key" ON "achievements"("user_id", "key");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_user_kind_key" ON "notification_preferences"("user_id", "kind");

-- CreateIndex
CREATE INDEX "notification_jobs_status_next_run_at_idx" ON "notification_jobs"("status", "next_run_at");

-- CreateIndex
CREATE INDEX "support_resources_country_status_idx" ON "support_resources"("country", "status");

-- CreateIndex
CREATE INDEX "product_events_name_created_at_idx" ON "product_events"("name", "created_at");

-- CreateIndex
CREATE INDEX "admin_audit_logs_entity_created_at_idx" ON "admin_audit_logs"("entity", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "users_telegram_id_key" ON "users"("telegram_id");

-- AddForeignKey
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_consents" ADD CONSTRAINT "user_consents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_versions" ADD CONSTRAINT "practice_versions_practice_id_fkey" FOREIGN KEY ("practice_id") REFERENCES "practices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_favorites" ADD CONSTRAINT "practice_favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_exclusions" ADD CONSTRAINT "practice_exclusions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_sessions" ADD CONSTRAINT "practice_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_feedback" ADD CONSTRAINT "practice_feedback_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "practice_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routines" ADD CONSTRAINT "routines_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routine_occurrences" ADD CONSTRAINT "routine_occurrences_routine_id_fkey" FOREIGN KEY ("routine_id") REFERENCES "routines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_versions" ADD CONSTRAINT "program_versions_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_days" ADD CONSTRAINT "program_days_program_version_id_fkey" FOREIGN KEY ("program_version_id") REFERENCES "program_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_enrollments" ADD CONSTRAINT "program_enrollments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_enrollments" ADD CONSTRAINT "program_enrollments_program_version_id_fkey" FOREIGN KEY ("program_version_id") REFERENCES "program_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_day_logs" ADD CONSTRAINT "program_day_logs_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "program_enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "focus_sessions" ADD CONSTRAINT "focus_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sleep_entries" ADD CONSTRAINT "sleep_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gardens" ADD CONSTRAINT "gardens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "garden_plants" ADD CONSTRAINT "garden_plants_garden_id_fkey" FOREIGN KEY ("garden_id") REFERENCES "gardens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reward_ledger" ADD CONSTRAINT "reward_ledger_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "achievements" ADD CONSTRAINT "achievements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_jobs" ADD CONSTRAINT "notification_jobs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

