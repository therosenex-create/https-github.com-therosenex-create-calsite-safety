-- AlterEnum
ALTER TYPE "PermitRecordStatus" ADD VALUE 'ISSUED';

-- AlterTable
ALTER TABLE "city_sources" ADD COLUMN     "agency_kind" TEXT NOT NULL DEFAULT 'CITY',
ADD COLUMN     "caltrans_district_note" TEXT,
ADD COLUMN     "contact_email" TEXT,
ADD COLUMN     "contact_name" TEXT,
ADD COLUMN     "contact_phone" TEXT;

-- AlterTable
ALTER TABLE "permit_records" ADD COLUMN     "closed_on" TIMESTAMP(3),
ADD COLUMN     "document_id" TEXT,
ADD COLUMN     "expires_on" TIMESTAMP(3),
ADD COLUMN     "issued_on" TIMESTAMP(3),
ADD COLUMN     "permit_category" TEXT NOT NULL DEFAULT 'custom';

-- CreateTable
CREATE TABLE "local_rule_notes" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "project_id" TEXT,
    "requirement_id" TEXT,
    "topic" TEXT NOT NULL,
    "rule_text" TEXT NOT NULL,
    "citation_url" TEXT,
    "rationale" TEXT,
    "review_status" "ReviewStatus" NOT NULL DEFAULT 'PENDING_QUALIFIED_REVIEW',
    "document_id" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "local_rule_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "closeout_items" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "item_key" TEXT NOT NULL,
    "note" TEXT,
    "document_id" TEXT,
    "signoff_name" TEXT,
    "acknowledged_not_a_signature" BOOLEAN NOT NULL DEFAULT false,
    "recorded_at" TIMESTAMP(3),

    CONSTRAINT "closeout_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "local_rule_notes_organization_id_idx" ON "local_rule_notes"("organization_id");

-- CreateIndex
CREATE INDEX "closeout_items_organization_id_idx" ON "closeout_items"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "closeout_items_project_id_item_key_key" ON "closeout_items"("project_id", "item_key");

-- AddForeignKey
ALTER TABLE "permit_records" ADD CONSTRAINT "permit_records_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "safety_documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "local_rule_notes" ADD CONSTRAINT "local_rule_notes_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "local_rule_notes" ADD CONSTRAINT "local_rule_notes_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "local_rule_notes" ADD CONSTRAINT "local_rule_notes_requirement_id_fkey" FOREIGN KEY ("requirement_id") REFERENCES "regulatory_requirements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "local_rule_notes" ADD CONSTRAINT "local_rule_notes_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "safety_documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "closeout_items" ADD CONSTRAINT "closeout_items_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "closeout_items" ADD CONSTRAINT "closeout_items_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "closeout_items" ADD CONSTRAINT "closeout_items_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "safety_documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
