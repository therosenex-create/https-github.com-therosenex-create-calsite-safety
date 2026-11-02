import { beforeEach, afterAll } from "vitest";
import { prisma } from "../src/lib/db";

const tables = [
  "contract_impact_reviews",
  "contract_drafts",
  "contract_documents",
  "evidence_packet_items",
  "evidence_packets",
  "closeout_items",
  "local_rule_notes",
  "certified_payroll_drafts",
  "public_works_records",
  "wildfire_smoke_plans",
  "heat_illness_plans",
  "login_attempts",
  "regulatory_reviews",
  "permit_records",
  "city_sources",
  "audit_events",
  "license_checks",
  "compliance_tasks",
  "compliance_evidence_links",
  "project_requirements",
  "company_requirements",
  "regulatory_changes",
  "requirement_applicability_rules",
  "requirement_evidence_types",
  "requirement_exceptions",
  "requirement_triggers",
  "regulatory_requirements",
  "regulatory_versions",
  "regulatory_sources",
  "jurisdictions",
  "agencies",
  "iipp_submittals",
  "iipp_revisions",
  "iipp_elements",
  "iipp_programs",
  "safety_documents",
  "incident_reports",
  "corrective_actions",
  "findings",
  "inspections",
  "training_records",
  "meeting_acknowledgments",
  "meeting_attendance",
  "safety_meetings",
  "project_assignments",
  "employees",
  "projects",
  "memberships",
  "users",
  "organizations",
];

beforeEach(async () => {
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables.map((table) => `"${table}"`).join(", ")} RESTART IDENTITY CASCADE`);
});

afterAll(async () => {
  await prisma.$disconnect();
});
