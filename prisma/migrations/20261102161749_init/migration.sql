-- CreateEnum
CREATE TYPE "MembershipRole" AS ENUM ('ADMIN', 'SAFETY_MANAGER', 'WORKER');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('PLANNED', 'ACTIVE', 'ON_HOLD', 'COMPLETE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "OwnerType" AS ENUM ('PRIVATE', 'PUBLIC_AGENCY', 'SCHOOL_OR_COLLEGE', 'SPECIAL_DISTRICT', 'HOMEOWNER', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "PublicWorksStatus" AS ENUM ('UNKNOWN', 'POTENTIALLY_APPLICABLE', 'NOT_APPLICABLE', 'APPLICABLE', 'PENDING_QUALIFIED_REVIEW');

-- CreateEnum
CREATE TYPE "EmployeeStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "MeetingStatus" AS ENUM ('SCHEDULED', 'COMPLETE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PolicyBasis" AS ENUM ('COMPANY_POLICY', 'CONTRACT_REQUIREMENT', 'RECORDED_AGAINST_CITATION');

-- CreateEnum
CREATE TYPE "TrainingStatus" AS ENUM ('RECORDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "InspectionStatus" AS ENUM ('OPEN', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "FindingStatus" AS ENUM ('OPEN', 'CORRECTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'IMMINENT_DANGER');

-- CreateEnum
CREATE TYPE "ActionStatus" AS ENUM ('OPEN', 'COMPLETE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "IncidentType" AS ENUM ('INJURY', 'ILLNESS', 'NEAR_MISS', 'PROPERTY_DAMAGE', 'EXPOSURE', 'OTHER');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('VERIFICATION_REQUIRED', 'LOOKUP_FAILED', 'MANUALLY_RECORDED', 'STALE', 'EXPIRED', 'SUSPENDED', 'INACTIVE', 'CANCELED');

-- CreateEnum
CREATE TYPE "ApplicabilityState" AS ENUM ('APPLICABLE', 'POTENTIALLY_APPLICABLE', 'NOT_APPLICABLE', 'CONTRACTUALLY_REQUIRED', 'RECOMMENDED_PRACTICE', 'PENDING_QUALIFIED_REVIEW', 'SUPERSEDED', 'VERIFICATION_OVERDUE');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('UNREVIEWED', 'PENDING_QUALIFIED_REVIEW', 'SOURCE_LINKED', 'NEEDS_UPDATE', 'RETIRED');

-- CreateEnum
CREATE TYPE "SourceReliability" AS ENUM ('PRIMARY_STATUTE_OR_REGULATION', 'OFFICIAL_AGENCY_PUBLICATION', 'LOCAL_OFFICIAL_DOCUMENT', 'CONTRACT_DOCUMENT', 'SECONDARY_REFERENCE');

-- CreateEnum
CREATE TYPE "DocumentKind" AS ENUM ('BINDING_STATUTE', 'REGULATION', 'GUIDANCE', 'FORM', 'FAQ', 'MODEL_TEMPLATE', 'RECOMMENDATION', 'EXPLANATORY', 'HOMEPAGE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "RetrievalStatus" AS ENUM ('NOT_CONFIGURED', 'URL_REACHABLE', 'FETCHED_PARTIAL', 'BLOCKED', 'FAILED');

-- CreateEnum
CREATE TYPE "EvidenceLinkStatus" AS ENUM ('UPLOADED', 'REVIEWED', 'APPROVED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('OPEN', 'DONE', 'CANCELED');

-- CreateEnum
CREATE TYPE "IippStatus" AS ENUM ('TEMPLATE', 'IN_PROGRESS');

-- CreateEnum
CREATE TYPE "TaskBasis" AS ENUM ('USER_ENTERED', 'REQUIREMENT_UNVERIFIED');

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "legal_name" TEXT,
    "dba" TEXT,
    "slug" TEXT NOT NULL,
    "is_demonstration" BOOLEAN NOT NULL DEFAULT false,
    "cslb_license_number" TEXT,
    "cslb_classification" TEXT,
    "cslb_verification_status" "VerificationStatus" NOT NULL DEFAULT 'VERIFICATION_REQUIRED',
    "dir_registration_number" TEXT,
    "dir_verification_status" "VerificationStatus" NOT NULL DEFAULT 'VERIFICATION_REQUIRED',
    "mailing_city" TEXT,
    "mailing_state" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memberships" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "role" "MembershipRole" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "jobsite_name" TEXT,
    "street_address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "county" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'CA',
    "postal_code" TEXT,
    "jurisdiction_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "owner_type" "OwnerType" NOT NULL DEFAULT 'UNKNOWN',
    "owner_name" TEXT,
    "public_works_status" "PublicWorksStatus" NOT NULL DEFAULT 'UNKNOWN',
    "public_works_rationale" TEXT,
    "scope_of_work" TEXT,
    "description" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'PLANNED',
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "job_title" TEXT,
    "trade" TEXT,
    "preferred_language" TEXT NOT NULL DEFAULT 'en',
    "hire_date" TIMESTAMP(3),
    "status" "EmployeeStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_assignments" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "safety_meetings" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "project_id" TEXT,
    "title" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "leader_name" TEXT NOT NULL,
    "policy_basis" "PolicyBasis" NOT NULL DEFAULT 'COMPANY_POLICY',
    "requirement_code" TEXT,
    "discussion_points" TEXT,
    "worker_questions" TEXT,
    "follow_up" TEXT,
    "notes" TEXT,
    "status" "MeetingStatus" NOT NULL DEFAULT 'SCHEDULED',
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "safety_meetings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meeting_attendance" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "meeting_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "present" BOOLEAN NOT NULL DEFAULT true,
    "acknowledged_at" TIMESTAMP(3),
    "method" TEXT NOT NULL DEFAULT 'onscreen_checkbox',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meeting_attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_records" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "project_id" TEXT,
    "topic" TEXT NOT NULL,
    "provider" TEXT,
    "completed_on" TIMESTAMP(3) NOT NULL,
    "expires_on" TIMESTAMP(3),
    "evidence_note" TEXT,
    "status" "TrainingStatus" NOT NULL DEFAULT 'RECORDED',
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "training_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspections" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "inspected_at" TIMESTAMP(3) NOT NULL,
    "inspector_name" TEXT NOT NULL,
    "location" TEXT,
    "summary" TEXT NOT NULL,
    "checklist" JSONB NOT NULL DEFAULT '[]',
    "status" "InspectionStatus" NOT NULL DEFAULT 'OPEN',
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inspections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "findings" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "inspection_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" "Severity" NOT NULL DEFAULT 'MEDIUM',
    "immediate_action" TEXT,
    "status" "FindingStatus" NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "findings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "corrective_actions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "finding_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "responsible_name" TEXT NOT NULL,
    "due_date" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "evidence_note" TEXT,
    "status" "ActionStatus" NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "corrective_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incident_reports" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "project_id" TEXT,
    "type" "IncidentType" NOT NULL,
    "severity" "Severity" NOT NULL DEFAULT 'LOW',
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "description" TEXT NOT NULL,
    "immediate_actions" TEXT,
    "people_involved" TEXT,
    "investigation_notes" TEXT,
    "status" "IncidentStatus" NOT NULL DEFAULT 'OPEN',
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "incident_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "safety_documents" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "project_id" TEXT,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "file_name" TEXT,
    "mime_type" TEXT,
    "byte_size" INTEGER,
    "sha256" TEXT,
    "content_bytes" BYTEA,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "safety_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iipp_programs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "status" "IippStatus" NOT NULL DEFAULT 'TEMPLATE',
    "implementation_claim" TEXT,
    "claim_recorded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "iipp_programs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iipp_elements" (
    "id" TEXT NOT NULL,
    "program_id" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "key" TEXT NOT NULL,
    "citation" TEXT NOT NULL,
    "title_en" TEXT NOT NULL,
    "title_es" TEXT NOT NULL,
    "user_procedure" TEXT,
    "responsible_name" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "iipp_elements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agencies" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "abbreviation" TEXT NOT NULL,
    "website_url" TEXT NOT NULL,
    "level" TEXT NOT NULL,

    CONSTRAINT "agencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jurisdictions" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "state" TEXT,

    CONSTRAINT "jurisdictions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regulatory_sources" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "agency_id" TEXT NOT NULL,
    "jurisdiction_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "document_kind" "DocumentKind" NOT NULL,
    "subject" TEXT NOT NULL,
    "official_url" TEXT NOT NULL,
    "version_label" TEXT NOT NULL,
    "publication_date" TIMESTAMP(3),
    "effective_date" TIMESTAMP(3),
    "geographic_area" TEXT NOT NULL,
    "reliability" "SourceReliability" NOT NULL,
    "review_status" "ReviewStatus" NOT NULL,
    "is_binding" BOOLEAN NOT NULL DEFAULT false,
    "limitations" TEXT NOT NULL,
    "retrieval_status" "RetrievalStatus" NOT NULL,
    "retrieved_at" TIMESTAMP(3),
    "automated_retrieval_configured" BOOLEAN NOT NULL DEFAULT false,
    "content_fingerprint" TEXT,
    "fingerprint_scope" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "regulatory_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regulatory_versions" (
    "id" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "version_label" TEXT NOT NULL,
    "retrieved_at" TIMESTAMP(3),
    "fingerprint" TEXT,
    "fingerprint_scope" TEXT NOT NULL,
    "notes" TEXT NOT NULL,

    CONSTRAINT "regulatory_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regulatory_requirements" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "citation" TEXT NOT NULL,
    "plain_language_en" TEXT NOT NULL,
    "plain_language_es" TEXT NOT NULL,
    "official_excerpt" TEXT,
    "excerpt_is_partial" BOOLEAN NOT NULL DEFAULT true,
    "scope" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "activity" TEXT NOT NULL,
    "geographic_scope" TEXT NOT NULL,
    "responsible_party" TEXT NOT NULL,
    "deadline_or_trigger" TEXT NOT NULL,
    "deadline_verified" BOOLEAN NOT NULL DEFAULT false,
    "recurrence" TEXT,
    "consequences_note" TEXT,
    "review_status" "ReviewStatus" NOT NULL,
    "limitations" TEXT NOT NULL,
    "last_verified_at" TIMESTAMP(3),
    "default_applicability" "ApplicabilityState" NOT NULL,
    "legal_authority" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "regulatory_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "requirement_triggers" (
    "id" TEXT NOT NULL,
    "requirement_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "stated_in_source" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "requirement_triggers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "requirement_exceptions" (
    "id" TEXT NOT NULL,
    "requirement_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "partial" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "requirement_exceptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "requirement_evidence_types" (
    "id" TEXT NOT NULL,
    "requirement_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "stated_in_source" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "requirement_evidence_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "requirement_applicability_rules" (
    "id" TEXT NOT NULL,
    "requirement_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "result" "ApplicabilityState" NOT NULL,

    CONSTRAINT "requirement_applicability_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regulatory_changes" (
    "id" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "detected_at" TIMESTAMP(3) NOT NULL,
    "legal_effective_date" TIMESTAMP(3),
    "summary" TEXT NOT NULL,
    "review_status" "ReviewStatus" NOT NULL DEFAULT 'PENDING_QUALIFIED_REVIEW',
    "retrieval_performed" BOOLEAN NOT NULL DEFAULT false,
    "flagged_by_user_id" TEXT,
    "flagged_by_organization_id" TEXT,

    CONSTRAINT "regulatory_changes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_requirements" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "requirement_id" TEXT NOT NULL,
    "applicability" "ApplicabilityState" NOT NULL,
    "rationale" TEXT NOT NULL,
    "responsible_role" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_requirements" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "requirement_id" TEXT NOT NULL,
    "applicability" "ApplicabilityState" NOT NULL,
    "rationale" TEXT NOT NULL,
    "responsible_role" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_evidence_links" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "requirement_id" TEXT NOT NULL,
    "project_id" TEXT,
    "document_id" TEXT,
    "inspection_id" TEXT,
    "meeting_id" TEXT,
    "training_record_id" TEXT,
    "incident_id" TEXT,
    "status" "EvidenceLinkStatus" NOT NULL DEFAULT 'UPLOADED',
    "note" TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "compliance_evidence_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_tasks" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "project_id" TEXT,
    "requirement_id" TEXT,
    "corrective_action_id" TEXT,
    "title" TEXT NOT NULL,
    "due_at" TIMESTAMP(3),
    "basis" "TaskBasis" NOT NULL,
    "basis_note" TEXT NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compliance_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "license_checks" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "status" "VerificationStatus" NOT NULL,
    "note" TEXT NOT NULL,
    "checked_at" TIMESTAMP(3) NOT NULL,
    "recorded_by_id" TEXT NOT NULL,

    CONSTRAINT "license_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "actor_user_id" TEXT NOT NULL,
    "actor_role" "MembershipRole" NOT NULL,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "memberships_organization_id_idx" ON "memberships"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "memberships_user_id_organization_id_key" ON "memberships"("user_id", "organization_id");

-- CreateIndex
CREATE INDEX "projects_organization_id_status_idx" ON "projects"("organization_id", "status");

-- CreateIndex
CREATE INDEX "employees_organization_id_status_idx" ON "employees"("organization_id", "status");

-- CreateIndex
CREATE INDEX "project_assignments_organization_id_idx" ON "project_assignments"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "project_assignments_project_id_employee_id_key" ON "project_assignments"("project_id", "employee_id");

-- CreateIndex
CREATE INDEX "safety_meetings_organization_id_scheduled_at_idx" ON "safety_meetings"("organization_id", "scheduled_at");

-- CreateIndex
CREATE INDEX "meeting_attendance_organization_id_idx" ON "meeting_attendance"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "meeting_attendance_meeting_id_employee_id_key" ON "meeting_attendance"("meeting_id", "employee_id");

-- CreateIndex
CREATE INDEX "training_records_organization_id_completed_on_idx" ON "training_records"("organization_id", "completed_on");

-- CreateIndex
CREATE INDEX "inspections_organization_id_inspected_at_idx" ON "inspections"("organization_id", "inspected_at");

-- CreateIndex
CREATE INDEX "findings_organization_id_status_idx" ON "findings"("organization_id", "status");

-- CreateIndex
CREATE INDEX "corrective_actions_organization_id_status_idx" ON "corrective_actions"("organization_id", "status");

-- CreateIndex
CREATE INDEX "incident_reports_organization_id_occurred_at_idx" ON "incident_reports"("organization_id", "occurred_at");

-- CreateIndex
CREATE INDEX "safety_documents_organization_id_archived_idx" ON "safety_documents"("organization_id", "archived");

-- CreateIndex
CREATE UNIQUE INDEX "iipp_programs_organization_id_key" ON "iipp_programs"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "iipp_elements_program_id_key_key" ON "iipp_elements"("program_id", "key");

-- CreateIndex
CREATE UNIQUE INDEX "agencies_code_key" ON "agencies"("code");

-- CreateIndex
CREATE UNIQUE INDEX "jurisdictions_code_key" ON "jurisdictions"("code");

-- CreateIndex
CREATE UNIQUE INDEX "regulatory_sources_code_key" ON "regulatory_sources"("code");

-- CreateIndex
CREATE INDEX "regulatory_versions_source_id_idx" ON "regulatory_versions"("source_id");

-- CreateIndex
CREATE UNIQUE INDEX "regulatory_requirements_code_key" ON "regulatory_requirements"("code");

-- CreateIndex
CREATE INDEX "regulatory_requirements_review_status_idx" ON "regulatory_requirements"("review_status");

-- CreateIndex
CREATE INDEX "requirement_triggers_requirement_id_idx" ON "requirement_triggers"("requirement_id");

-- CreateIndex
CREATE INDEX "requirement_exceptions_requirement_id_idx" ON "requirement_exceptions"("requirement_id");

-- CreateIndex
CREATE INDEX "requirement_evidence_types_requirement_id_idx" ON "requirement_evidence_types"("requirement_id");

-- CreateIndex
CREATE INDEX "requirement_applicability_rules_requirement_id_idx" ON "requirement_applicability_rules"("requirement_id");

-- CreateIndex
CREATE INDEX "regulatory_changes_source_id_detected_at_idx" ON "regulatory_changes"("source_id", "detected_at");

-- CreateIndex
CREATE INDEX "company_requirements_organization_id_idx" ON "company_requirements"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "company_requirements_organization_id_requirement_id_key" ON "company_requirements"("organization_id", "requirement_id");

-- CreateIndex
CREATE INDEX "project_requirements_organization_id_idx" ON "project_requirements"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "project_requirements_project_id_requirement_id_key" ON "project_requirements"("project_id", "requirement_id");

-- CreateIndex
CREATE INDEX "compliance_evidence_links_organization_id_requirement_id_idx" ON "compliance_evidence_links"("organization_id", "requirement_id");

-- CreateIndex
CREATE INDEX "compliance_tasks_organization_id_status_idx" ON "compliance_tasks"("organization_id", "status");

-- CreateIndex
CREATE INDEX "license_checks_organization_id_kind_checked_at_idx" ON "license_checks"("organization_id", "kind", "checked_at");

-- CreateIndex
CREATE INDEX "audit_events_organization_id_created_at_idx" ON "audit_events"("organization_id", "created_at");

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_assignments" ADD CONSTRAINT "project_assignments_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_assignments" ADD CONSTRAINT "project_assignments_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "safety_meetings" ADD CONSTRAINT "safety_meetings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "safety_meetings" ADD CONSTRAINT "safety_meetings_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meeting_attendance" ADD CONSTRAINT "meeting_attendance_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "safety_meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meeting_attendance" ADD CONSTRAINT "meeting_attendance_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_records" ADD CONSTRAINT "training_records_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_records" ADD CONSTRAINT "training_records_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_records" ADD CONSTRAINT "training_records_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "findings" ADD CONSTRAINT "findings_inspection_id_fkey" FOREIGN KEY ("inspection_id") REFERENCES "inspections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corrective_actions" ADD CONSTRAINT "corrective_actions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corrective_actions" ADD CONSTRAINT "corrective_actions_finding_id_fkey" FOREIGN KEY ("finding_id") REFERENCES "findings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_reports" ADD CONSTRAINT "incident_reports_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_reports" ADD CONSTRAINT "incident_reports_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "safety_documents" ADD CONSTRAINT "safety_documents_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "safety_documents" ADD CONSTRAINT "safety_documents_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iipp_programs" ADD CONSTRAINT "iipp_programs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iipp_elements" ADD CONSTRAINT "iipp_elements_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "iipp_programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regulatory_sources" ADD CONSTRAINT "regulatory_sources_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regulatory_sources" ADD CONSTRAINT "regulatory_sources_jurisdiction_id_fkey" FOREIGN KEY ("jurisdiction_id") REFERENCES "jurisdictions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regulatory_versions" ADD CONSTRAINT "regulatory_versions_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "regulatory_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regulatory_requirements" ADD CONSTRAINT "regulatory_requirements_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "regulatory_sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requirement_triggers" ADD CONSTRAINT "requirement_triggers_requirement_id_fkey" FOREIGN KEY ("requirement_id") REFERENCES "regulatory_requirements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requirement_exceptions" ADD CONSTRAINT "requirement_exceptions_requirement_id_fkey" FOREIGN KEY ("requirement_id") REFERENCES "regulatory_requirements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requirement_evidence_types" ADD CONSTRAINT "requirement_evidence_types_requirement_id_fkey" FOREIGN KEY ("requirement_id") REFERENCES "regulatory_requirements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requirement_applicability_rules" ADD CONSTRAINT "requirement_applicability_rules_requirement_id_fkey" FOREIGN KEY ("requirement_id") REFERENCES "regulatory_requirements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regulatory_changes" ADD CONSTRAINT "regulatory_changes_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "regulatory_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_requirements" ADD CONSTRAINT "company_requirements_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_requirements" ADD CONSTRAINT "company_requirements_requirement_id_fkey" FOREIGN KEY ("requirement_id") REFERENCES "regulatory_requirements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_requirements" ADD CONSTRAINT "project_requirements_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_requirements" ADD CONSTRAINT "project_requirements_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_requirements" ADD CONSTRAINT "project_requirements_requirement_id_fkey" FOREIGN KEY ("requirement_id") REFERENCES "regulatory_requirements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_evidence_links" ADD CONSTRAINT "compliance_evidence_links_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_evidence_links" ADD CONSTRAINT "compliance_evidence_links_requirement_id_fkey" FOREIGN KEY ("requirement_id") REFERENCES "regulatory_requirements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_evidence_links" ADD CONSTRAINT "compliance_evidence_links_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_evidence_links" ADD CONSTRAINT "compliance_evidence_links_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "safety_documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_evidence_links" ADD CONSTRAINT "compliance_evidence_links_inspection_id_fkey" FOREIGN KEY ("inspection_id") REFERENCES "inspections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_evidence_links" ADD CONSTRAINT "compliance_evidence_links_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "safety_meetings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_evidence_links" ADD CONSTRAINT "compliance_evidence_links_training_record_id_fkey" FOREIGN KEY ("training_record_id") REFERENCES "training_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_evidence_links" ADD CONSTRAINT "compliance_evidence_links_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "incident_reports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_tasks" ADD CONSTRAINT "compliance_tasks_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_tasks" ADD CONSTRAINT "compliance_tasks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_tasks" ADD CONSTRAINT "compliance_tasks_requirement_id_fkey" FOREIGN KEY ("requirement_id") REFERENCES "regulatory_requirements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_tasks" ADD CONSTRAINT "compliance_tasks_corrective_action_id_fkey" FOREIGN KEY ("corrective_action_id") REFERENCES "corrective_actions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "license_checks" ADD CONSTRAINT "license_checks_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
