-- A signed PDF belongs to one company. record_id can be typed by a user.
DROP INDEX "signed_record_pdfs_record_type_record_id_revision_key";

CREATE UNIQUE INDEX "signed_record_pdfs_organization_id_record_type_record_id_revision_key"
ON "signed_record_pdfs"("organization_id", "record_type", "record_id", "revision");

-- One unlocked crew-sign tailgate per project.
CREATE UNIQUE INDEX "safety_meetings_one_open_crew_tailgate"
ON "safety_meetings" ("project_id")
WHERE "crew_sign" = true AND "sign_locked_at" IS NULL AND "status" <> 'ARCHIVED';

-- One signature per enrolled person on a revision. A void does not free the slot; the next revision is a new row.
CREATE UNIQUE INDEX "signature_events_one_employee_per_revision"
ON "signature_events" ("organization_id", "record_type", "record_id", "record_revision", "employee_id")
WHERE "employee_id" IS NOT NULL;
