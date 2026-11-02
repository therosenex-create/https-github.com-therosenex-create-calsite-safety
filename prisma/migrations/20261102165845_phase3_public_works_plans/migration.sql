-- AlterTable
ALTER TABLE "safety_documents" ADD COLUMN     "object_key" TEXT,
ADD COLUMN     "storage_provider" TEXT NOT NULL DEFAULT 'DATABASE';

-- CreateTable
CREATE TABLE "heat_illness_plans" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "project_id" TEXT,
    "water_procedure" TEXT NOT NULL,
    "shade_procedure" TEXT NOT NULL,
    "high_heat_procedure" TEXT NOT NULL,
    "emergency_procedure" TEXT NOT NULL,
    "training_note" TEXT,
    "requirement_code" TEXT NOT NULL DEFAULT 'CCR-T8-3395',
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "heat_illness_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wildfire_smoke_plans" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "project_id" TEXT,
    "manual_check_procedure" TEXT NOT NULL,
    "control_note" TEXT NOT NULL,
    "respirator_note" TEXT,
    "requirement_code" TEXT NOT NULL DEFAULT 'CCR-T8-5141-1',
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wildfire_smoke_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public_works_records" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "awarding_body" TEXT NOT NULL,
    "registration_evidence_note" TEXT NOT NULL,
    "registration_document_id" TEXT,
    "registration_checked_at" TIMESTAMP(3) NOT NULL,
    "wage_determination_id" TEXT,
    "wage_note" TEXT NOT NULL,
    "apprenticeship_craft" TEXT,
    "apprenticeship_note" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "public_works_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certified_payroll_drafts" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "week_ending" TIMESTAMP(3) NOT NULL,
    "note" TEXT NOT NULL,
    "submitted_to_agency" BOOLEAN NOT NULL DEFAULT false,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "certified_payroll_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "heat_illness_plans_organization_id_idx" ON "heat_illness_plans"("organization_id");

-- CreateIndex
CREATE INDEX "wildfire_smoke_plans_organization_id_idx" ON "wildfire_smoke_plans"("organization_id");

-- CreateIndex
CREATE INDEX "public_works_records_organization_id_project_id_idx" ON "public_works_records"("organization_id", "project_id");

-- CreateIndex
CREATE INDEX "certified_payroll_drafts_organization_id_project_id_idx" ON "certified_payroll_drafts"("organization_id", "project_id");

-- AddForeignKey
ALTER TABLE "heat_illness_plans" ADD CONSTRAINT "heat_illness_plans_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "heat_illness_plans" ADD CONSTRAINT "heat_illness_plans_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wildfire_smoke_plans" ADD CONSTRAINT "wildfire_smoke_plans_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wildfire_smoke_plans" ADD CONSTRAINT "wildfire_smoke_plans_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public_works_records" ADD CONSTRAINT "public_works_records_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public_works_records" ADD CONSTRAINT "public_works_records_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certified_payroll_drafts" ADD CONSTRAINT "certified_payroll_drafts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certified_payroll_drafts" ADD CONSTRAINT "certified_payroll_drafts_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
