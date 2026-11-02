-- CreateEnum
CREATE TYPE "CompanyReviewDecision" AS ENUM ('STILL_PENDING', 'SOURCE_READ_WITH_LIMITATIONS', 'NEEDS_ANOTHER_PASS');

-- CreateEnum
CREATE TYPE "PermitRecordStatus" AS ENUM ('NOT_STARTED', 'DRAFT', 'SUBMITTED', 'CORRECTIONS', 'USER_REPORTED_APPROVAL', 'CLOSED', 'UNKNOWN');

-- AlterTable
ALTER TABLE "license_checks" ADD COLUMN     "document_id" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "session_version" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "regulatory_reviews" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "requirement_id" TEXT NOT NULL,
    "reviewer_user_id" TEXT NOT NULL,
    "decision" "CompanyReviewDecision" NOT NULL,
    "note" TEXT NOT NULL,
    "reviewed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledged_not_certification" BOOLEAN NOT NULL,

    CONSTRAINT "regulatory_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permit_records" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "authority_name" TEXT NOT NULL,
    "jurisdiction_label" TEXT NOT NULL,
    "permit_type" TEXT NOT NULL,
    "permit_number" TEXT,
    "status" "PermitRecordStatus" NOT NULL DEFAULT 'UNKNOWN',
    "applied_on" TIMESTAMP(3),
    "notes" TEXT,
    "official_url" TEXT,
    "source_review_status" "ReviewStatus" NOT NULL DEFAULT 'UNREVIEWED',
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "permit_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "city_sources" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "city_name" TEXT NOT NULL,
    "county_name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "official_url" TEXT,
    "notes" TEXT NOT NULL,
    "review_status" "ReviewStatus" NOT NULL DEFAULT 'UNREVIEWED',
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "city_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_attempts" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "attempted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "regulatory_reviews_organization_id_requirement_id_reviewed__idx" ON "regulatory_reviews"("organization_id", "requirement_id", "reviewed_at");

-- CreateIndex
CREATE INDEX "permit_records_organization_id_idx" ON "permit_records"("organization_id");

-- CreateIndex
CREATE INDEX "city_sources_organization_id_idx" ON "city_sources"("organization_id");

-- CreateIndex
CREATE INDEX "login_attempts_email_attempted_at_idx" ON "login_attempts"("email", "attempted_at");

-- AddForeignKey
ALTER TABLE "license_checks" ADD CONSTRAINT "license_checks_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "safety_documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regulatory_reviews" ADD CONSTRAINT "regulatory_reviews_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regulatory_reviews" ADD CONSTRAINT "regulatory_reviews_requirement_id_fkey" FOREIGN KEY ("requirement_id") REFERENCES "regulatory_requirements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regulatory_reviews" ADD CONSTRAINT "regulatory_reviews_reviewer_user_id_fkey" FOREIGN KEY ("reviewer_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permit_records" ADD CONSTRAINT "permit_records_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permit_records" ADD CONSTRAINT "permit_records_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "city_sources" ADD CONSTRAINT "city_sources_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
