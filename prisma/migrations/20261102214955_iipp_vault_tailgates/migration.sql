-- CreateEnum
CREATE TYPE "MeetingKind" AS ENUM ('GENERAL', 'TAILGATE');

-- CreateEnum
CREATE TYPE "IippRevisionState" AS ENUM ('ACTIVE', 'VERIFIED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "IippSubmittalStatus" AS ENUM ('PENDING_REVIEW', 'APPROVED');

-- AlterTable
ALTER TABLE "iipp_programs" ADD COLUMN     "administrator_name" TEXT,
ADD COLUMN     "administrator_title" TEXT,
ADD COLUMN     "annual_review_on" TIMESTAMP(3),
ADD COLUMN     "revision_label" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "title" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "safety_meetings" ADD COLUMN     "meeting_kind" "MeetingKind" NOT NULL DEFAULT 'GENERAL';

-- CreateTable
CREATE TABLE "meeting_acknowledgments" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "meeting_id" TEXT NOT NULL,
    "signer_name" TEXT NOT NULL,
    "role_label" TEXT NOT NULL,
    "signed_at" TIMESTAMP(3) NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'typed_name',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meeting_acknowledgments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iipp_revisions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "program_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "revision_label" TEXT NOT NULL,
    "administrator_name" TEXT,
    "administrator_title" TEXT,
    "annual_review_on" TIMESTAMP(3),
    "implementation_claim" TEXT,
    "element_snapshot" JSONB NOT NULL,
    "state" "IippRevisionState" NOT NULL DEFAULT 'ACTIVE',
    "verified_at" TIMESTAMP(3),
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "iipp_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iipp_submittals" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "note" TEXT,
    "status" "IippSubmittalStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "reviewed_at" TIMESTAMP(3),
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "iipp_submittals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "meeting_acknowledgments_organization_id_idx" ON "meeting_acknowledgments"("organization_id");

-- CreateIndex
CREATE INDEX "meeting_acknowledgments_meeting_id_idx" ON "meeting_acknowledgments"("meeting_id");

-- CreateIndex
CREATE INDEX "iipp_revisions_organization_id_created_at_idx" ON "iipp_revisions"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "iipp_revisions_program_id_state_idx" ON "iipp_revisions"("program_id", "state");

-- CreateIndex
CREATE INDEX "iipp_submittals_organization_id_project_id_idx" ON "iipp_submittals"("organization_id", "project_id");

-- CreateIndex
CREATE INDEX "safety_meetings_organization_id_meeting_kind_idx" ON "safety_meetings"("organization_id", "meeting_kind");

-- AddForeignKey
ALTER TABLE "meeting_acknowledgments" ADD CONSTRAINT "meeting_acknowledgments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meeting_acknowledgments" ADD CONSTRAINT "meeting_acknowledgments_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "safety_meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iipp_revisions" ADD CONSTRAINT "iipp_revisions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iipp_revisions" ADD CONSTRAINT "iipp_revisions_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "iipp_programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iipp_submittals" ADD CONSTRAINT "iipp_submittals_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iipp_submittals" ADD CONSTRAINT "iipp_submittals_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
