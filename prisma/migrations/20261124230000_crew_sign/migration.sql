-- CreateEnum
CREATE TYPE "WorkerType" AS ENUM ('W2', 'SUBCONTRACTOR', 'SUB_1099');

-- CreateEnum
CREATE TYPE "SignableType" AS ENUM ('TAILGATE', 'TRAINING_ACK', 'JHA_SIGNOFF', 'INSPECTION', 'CP_ACCEPTANCE', 'PROGRAM_ADOPTION', 'ESIGN_CONSENT');

-- CreateEnum
CREATE TYPE "SignRequestStatus" AS ENUM ('AWAITING', 'SIGNED', 'SUPERSEDED');

-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "company_name" TEXT,
ADD COLUMN     "worker_type" "WorkerType" NOT NULL DEFAULT 'W2';

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "code" TEXT;

-- AlterTable
ALTER TABLE "safety_meetings" ADD COLUMN     "conductor_employee_id" TEXT,
ADD COLUMN     "crew_sign" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hazards" TEXT,
ADD COLUMN     "sign_locked_at" TIMESTAMP(3),
ADD COLUMN     "sign_revision" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "topic_code" TEXT;

-- CreateTable
CREATE TABLE "consent_texts" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consent_texts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "signer_credentials" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "pin_hash" TEXT NOT NULL,
    "consent_text_id" TEXT NOT NULL,
    "consent_event_id" TEXT,
    "enrolled_by_user_id" TEXT NOT NULL,
    "enrolled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "failed_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "revoked_by_user_id" TEXT,

    CONSTRAINT "signer_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kiosk_links" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rotated_at" TIMESTAMP(3),

    CONSTRAINT "kiosk_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "signature_events" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "record_type" "SignableType" NOT NULL,
    "record_id" TEXT NOT NULL,
    "record_revision" INTEGER NOT NULL DEFAULT 1,
    "employee_id" TEXT,
    "user_id" TEXT,
    "signer_name" TEXT NOT NULL,
    "role_label" TEXT NOT NULL,
    "company_name" TEXT,
    "attestation_text" TEXT NOT NULL,
    "attestation_lang" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "signature_image" BYTEA NOT NULL,
    "strokes" JSONB NOT NULL,
    "typed_name" TEXT NOT NULL,
    "consent_text_id" TEXT,
    "ip" TEXT,
    "user_agent" TEXT,
    "device_id" TEXT,
    "signed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "late" BOOLEAN NOT NULL DEFAULT false,
    "flagged" BOOLEAN NOT NULL DEFAULT false,
    "record_hash" TEXT NOT NULL,
    "prev_event_hash" TEXT,
    "event_hash" TEXT NOT NULL,

    CONSTRAINT "signature_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "signature_voids" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "record_type" "SignableType" NOT NULL,
    "record_id" TEXT NOT NULL,
    "record_revision" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "voided_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "voided_by_user_id" TEXT,

    CONSTRAINT "signature_voids_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "signed_record_pdfs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "project_id" TEXT,
    "record_type" "SignableType" NOT NULL,
    "record_id" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "record_date" TIMESTAMP(3) NOT NULL,
    "file_name" TEXT NOT NULL,
    "bytes" BYTEA NOT NULL,
    "sha256" TEXT NOT NULL,
    "completed_at" TIMESTAMP(3) NOT NULL,
    "exported_at" TIMESTAMP(3),

    CONSTRAINT "signed_record_pdfs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paper_originals" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "record_type" "SignableType",
    "record_id" TEXT,
    "project_id" TEXT,
    "record_date" TIMESTAMP(3) NOT NULL,
    "form_code" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "pages" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "document_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "paper_originals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sign_requests" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "project_id" TEXT,
    "record_type" "SignableType" NOT NULL,
    "record_id" TEXT NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "form_code" TEXT NOT NULL,
    "status" "SignRequestStatus" NOT NULL DEFAULT 'AWAITING',
    "created_by_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sign_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kiosk_attempts" (
    "id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "attempted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kiosk_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "consent_texts_organization_id_idx" ON "consent_texts"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "consent_texts_organization_id_version_language_key" ON "consent_texts"("organization_id", "version", "language");

-- CreateIndex
CREATE UNIQUE INDEX "signer_credentials_employee_id_key" ON "signer_credentials"("employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "signer_credentials_consent_event_id_key" ON "signer_credentials"("consent_event_id");

-- CreateIndex
CREATE INDEX "signer_credentials_organization_id_idx" ON "signer_credentials"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "kiosk_links_token_hash_key" ON "kiosk_links"("token_hash");

-- CreateIndex
CREATE INDEX "kiosk_links_organization_id_project_id_idx" ON "kiosk_links"("organization_id", "project_id");

-- CreateIndex
CREATE UNIQUE INDEX "signature_events_event_hash_key" ON "signature_events"("event_hash");

-- CreateIndex
CREATE INDEX "signature_events_organization_id_record_type_record_id_idx" ON "signature_events"("organization_id", "record_type", "record_id");

-- CreateIndex
CREATE UNIQUE INDEX "signature_voids_event_id_key" ON "signature_voids"("event_id");

-- CreateIndex
CREATE INDEX "signature_voids_organization_id_record_type_record_id_idx" ON "signature_voids"("organization_id", "record_type", "record_id");

-- CreateIndex
CREATE INDEX "signed_record_pdfs_organization_id_idx" ON "signed_record_pdfs"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "signed_record_pdfs_record_type_record_id_revision_key" ON "signed_record_pdfs"("record_type", "record_id", "revision");

-- CreateIndex
CREATE INDEX "paper_originals_organization_id_idx" ON "paper_originals"("organization_id");

-- CreateIndex
CREATE INDEX "sign_requests_organization_id_status_idx" ON "sign_requests"("organization_id", "status");

-- CreateIndex
CREATE INDEX "kiosk_attempts_token_hash_ip_attempted_at_idx" ON "kiosk_attempts"("token_hash", "ip", "attempted_at");

-- AddForeignKey
ALTER TABLE "safety_meetings" ADD CONSTRAINT "safety_meetings_conductor_employee_id_fkey" FOREIGN KEY ("conductor_employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_texts" ADD CONSTRAINT "consent_texts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signer_credentials" ADD CONSTRAINT "signer_credentials_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signer_credentials" ADD CONSTRAINT "signer_credentials_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signer_credentials" ADD CONSTRAINT "signer_credentials_consent_text_id_fkey" FOREIGN KEY ("consent_text_id") REFERENCES "consent_texts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signer_credentials" ADD CONSTRAINT "signer_credentials_consent_event_id_fkey" FOREIGN KEY ("consent_event_id") REFERENCES "signature_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signer_credentials" ADD CONSTRAINT "signer_credentials_enrolled_by_user_id_fkey" FOREIGN KEY ("enrolled_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signer_credentials" ADD CONSTRAINT "signer_credentials_revoked_by_user_id_fkey" FOREIGN KEY ("revoked_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kiosk_links" ADD CONSTRAINT "kiosk_links_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kiosk_links" ADD CONSTRAINT "kiosk_links_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signature_events" ADD CONSTRAINT "signature_events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signature_events" ADD CONSTRAINT "signature_events_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signature_events" ADD CONSTRAINT "signature_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signature_events" ADD CONSTRAINT "signature_events_consent_text_id_fkey" FOREIGN KEY ("consent_text_id") REFERENCES "consent_texts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signature_voids" ADD CONSTRAINT "signature_voids_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signature_voids" ADD CONSTRAINT "signature_voids_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "signature_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signature_voids" ADD CONSTRAINT "signature_voids_voided_by_user_id_fkey" FOREIGN KEY ("voided_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signed_record_pdfs" ADD CONSTRAINT "signed_record_pdfs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signed_record_pdfs" ADD CONSTRAINT "signed_record_pdfs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paper_originals" ADD CONSTRAINT "paper_originals_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paper_originals" ADD CONSTRAINT "paper_originals_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sign_requests" ADD CONSTRAINT "sign_requests_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sign_requests" ADD CONSTRAINT "sign_requests_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sign_requests" ADD CONSTRAINT "sign_requests_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- signature_events is append-only. A correction is a new signature_voids row.
CREATE OR REPLACE FUNCTION signature_events_no_update_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'signature_events are append-only';
END;
$$;

CREATE TRIGGER signature_events_no_update_delete
BEFORE UPDATE OR DELETE ON signature_events
FOR EACH ROW
EXECUTE FUNCTION signature_events_no_update_delete();

-- exported_at is the only column a filing agent writes. This view does not expose it.
CREATE VIEW v_signed_export AS
SELECT
  s.id,
  p.name AS project_name,
  p.code AS project_code,
  s.record_type::text AS record_type,
  s.record_date,
  s.file_name,
  s.sha256,
  s.completed_at
FROM signed_record_pdfs s
LEFT JOIN projects p ON p.id = s.project_id;
