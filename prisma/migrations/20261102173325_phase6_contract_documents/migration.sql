-- AlterEnum
ALTER TYPE "TaskBasis" ADD VALUE 'CONTRACT_ACCEPTED';

-- AlterTable
ALTER TABLE "compliance_tasks" ADD COLUMN     "evidence_document_id" TEXT;

-- CreateTable
CREATE TABLE "contract_documents" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "doc_type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "parties" TEXT NOT NULL,
    "effective_on" TIMESTAMP(3),
    "received_on" TIMESTAMP(3),
    "revision_label" TEXT,
    "notes" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_drafts" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "contract_document_id" TEXT NOT NULL,
    "clause_reference" TEXT NOT NULL,
    "quote" TEXT NOT NULL,
    "requirement_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "accept_reason" TEXT,
    "accepted_by_id" TEXT,
    "accepted_at" TIMESTAMP(3),
    "local_rule_note_id" TEXT,
    "task_id" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_impact_reviews" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "contract_document_id" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "reviewed_by_id" TEXT NOT NULL,
    "reviewed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_impact_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contract_documents_organization_id_project_id_idx" ON "contract_documents"("organization_id", "project_id");

-- CreateIndex
CREATE UNIQUE INDEX "contract_drafts_local_rule_note_id_key" ON "contract_drafts"("local_rule_note_id");

-- CreateIndex
CREATE UNIQUE INDEX "contract_drafts_task_id_key" ON "contract_drafts"("task_id");

-- CreateIndex
CREATE INDEX "contract_drafts_organization_id_status_idx" ON "contract_drafts"("organization_id", "status");

-- CreateIndex
CREATE INDEX "contract_impact_reviews_organization_id_project_id_idx" ON "contract_impact_reviews"("organization_id", "project_id");

-- AddForeignKey
ALTER TABLE "compliance_tasks" ADD CONSTRAINT "compliance_tasks_evidence_document_id_fkey" FOREIGN KEY ("evidence_document_id") REFERENCES "safety_documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_documents" ADD CONSTRAINT "contract_documents_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_documents" ADD CONSTRAINT "contract_documents_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_documents" ADD CONSTRAINT "contract_documents_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "safety_documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_drafts" ADD CONSTRAINT "contract_drafts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_drafts" ADD CONSTRAINT "contract_drafts_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_drafts" ADD CONSTRAINT "contract_drafts_contract_document_id_fkey" FOREIGN KEY ("contract_document_id") REFERENCES "contract_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_drafts" ADD CONSTRAINT "contract_drafts_requirement_id_fkey" FOREIGN KEY ("requirement_id") REFERENCES "regulatory_requirements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_drafts" ADD CONSTRAINT "contract_drafts_accepted_by_id_fkey" FOREIGN KEY ("accepted_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_drafts" ADD CONSTRAINT "contract_drafts_local_rule_note_id_fkey" FOREIGN KEY ("local_rule_note_id") REFERENCES "local_rule_notes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_drafts" ADD CONSTRAINT "contract_drafts_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "compliance_tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_impact_reviews" ADD CONSTRAINT "contract_impact_reviews_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_impact_reviews" ADD CONSTRAINT "contract_impact_reviews_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_impact_reviews" ADD CONSTRAINT "contract_impact_reviews_contract_document_id_fkey" FOREIGN KEY ("contract_document_id") REFERENCES "contract_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_impact_reviews" ADD CONSTRAINT "contract_impact_reviews_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
