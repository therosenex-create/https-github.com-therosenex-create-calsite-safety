import type { ApplicabilityState, Prisma, ReviewStatus } from "@prisma/client";
import type { Actor } from "../actor";
import { assertCan } from "../authz";
import { prisma } from "../db";
import { AppError } from "../errors";
import { applicabilitySchema, catalogSearchSchema, evidenceLinkSchema, parseInput } from "../validation";
import { audit } from "./common";

export async function listSources(q?: string) {
  const query = q?.trim().slice(0, 80);
  return prisma.regulatorySource.findMany({
    where: query
      ? {
          OR: [
            { title: { contains: query, mode: "insensitive" } },
            { code: { contains: query, mode: "insensitive" } },
            { subject: { contains: query, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { title: "asc" },
    include: { agency: true, _count: { select: { requirements: true, changes: true } } },
  });
}

export async function getSource(id: string) {
  const source = await prisma.regulatorySource.findUnique({
    where: { id },
    include: {
      agency: true,
      jurisdiction: true,
      versions: { orderBy: { retrievedAt: "desc" } },
      changes: { orderBy: { detectedAt: "desc" } },
      requirements: { orderBy: { code: "asc" } },
    },
  });
  if (!source) throw new AppError("not_found");
  return source;
}

export async function listRequirements(q?: string) {
  const query = q?.trim().slice(0, 80);
  return prisma.regulatoryRequirement.findMany({
    where: query
      ? {
          OR: [
            { title: { contains: query, mode: "insensitive" } },
            { code: { contains: query, mode: "insensitive" } },
            { citation: { contains: query, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { citation: "asc" },
    include: { source: { select: { officialUrl: true, documentKind: true, isBinding: true, reviewStatus: true } } },
  });
}

export function catalogGuidance(requirement: { citation: string; reviewStatus: string; limitations: string }) {
  return {
    en: `Stored catalog fields only. Citation: ${requirement.citation}. Review status: ${requirement.reviewStatus}. Limitations: ${requirement.limitations}`,
    es: `Solo campos guardados del catálogo. Cita: ${requirement.citation}. Estado de revisión: ${requirement.reviewStatus}. Limitaciones: ${requirement.limitations}`,
  };
}

export async function searchCatalog(actor: Actor, input: unknown) {
  const filters = parseInput(catalogSearchSchema, input);
  const and: Prisma.RegulatoryRequirementWhereInput[] = [];
  const query = filters.q?.trim();
  if (query) {
    and.push({
      OR: [
        { citation: { contains: query, mode: "insensitive" } },
        { title: { contains: query, mode: "insensitive" } },
        { code: { contains: query, mode: "insensitive" } },
        { plainLanguageEn: { contains: query, mode: "insensitive" } },
        { plainLanguageEs: { contains: query, mode: "insensitive" } },
        { limitations: { contains: query, mode: "insensitive" } },
      ],
    });
  }
  if (filters.reviewStatus) and.push({ reviewStatus: filters.reviewStatus as ReviewStatus });
  if (filters.jurisdiction) {
    and.push({
      OR: [
        { source: { jurisdiction: { code: { equals: filters.jurisdiction, mode: "insensitive" } } } },
        { source: { jurisdiction: { name: { contains: filters.jurisdiction, mode: "insensitive" } } } },
        { geographicScope: { contains: filters.jurisdiction, mode: "insensitive" } },
      ],
    });
  }
  if (filters.applicability) {
    and.push({
      companyRequirements: {
        some: { organizationId: actor.organizationId, applicability: filters.applicability as ApplicabilityState },
      },
    });
  }
  const rows = await prisma.regulatoryRequirement.findMany({
    where: and.length ? { AND: and } : undefined,
    orderBy: { citation: "asc" },
    take: 50,
    include: {
      source: { select: { officialUrl: true, jurisdiction: { select: { code: true, name: true } } } },
      companyRequirements: { where: { organizationId: actor.organizationId }, take: 1 },
    },
  });
  return rows.map((row) => ({
    id: row.id,
    citation: row.citation,
    title: row.title,
    code: row.code,
    reviewStatus: row.reviewStatus,
    limitations: row.limitations,
    officialUrl: row.source.officialUrl,
    jurisdictionCode: row.source.jurisdiction.code,
    jurisdictionName: row.source.jurisdiction.name,
    companyNote: row.companyRequirements[0]?.rationale ?? null,
    companyApplicability: row.companyRequirements[0]?.applicability ?? null,
    guidance: catalogGuidance(row),
  }));
}

export async function listJurisdictions() {
  return prisma.jurisdiction.findMany({ orderBy: { name: "asc" }, select: { code: true, name: true } });
}

export async function getRequirement(id: string) {
  const requirement = await prisma.regulatoryRequirement.findUnique({
    where: { id },
    include: {
      source: { include: { agency: true } },
      triggers: true,
      exceptions: true,
      evidenceTypes: true,
      applicabilityRules: true,
    },
  });
  if (!requirement) throw new AppError("not_found");
  return requirement;
}

export async function flagSourceForManualReview(actor: Actor, sourceId: string, reason: string) {
  assertCan(actor, "flag_source");
  const note = reason.trim();
  if (note.length < 10) throw new AppError("too_small", "note");
  const source = await prisma.regulatorySource.findUnique({ where: { id: sourceId } });
  if (!source) throw new AppError("not_found");
  const change = await prisma.regulatoryChange.create({
    data: {
      sourceId,
      detectedAt: new Date(),
      legalEffectiveDate: null,
      retrievalPerformed: false,
      reviewStatus: "PENDING_QUALIFIED_REVIEW",
      flaggedByUserId: actor.userId,
      flaggedByOrganizationId: actor.organizationId,
      summary: `${note} Automated retrieval was not performed. No official page was downloaded. The legal effective date is unknown.`,
    },
  });
  await audit(prisma, actor, "flag_source_review", "RegulatoryChange", change.id, { sourceCode: source.code });
  return change;
}

export async function assignRequirement(actor: Actor, input: unknown) {
  assertCan(actor, "write_operations");
  const data = parseInput(applicabilitySchema, input);
  const requirement = await prisma.regulatoryRequirement.findUnique({ where: { id: data.requirementId } });
  if (!requirement) throw new AppError("not_found");
  if (data.projectId) {
    const project = await prisma.project.findFirst({
      where: { id: data.projectId, organizationId: actor.organizationId },
    });
    if (!project) throw new AppError("not_found");
    const row = await prisma.projectRequirement.upsert({
      where: { projectId_requirementId: { projectId: data.projectId, requirementId: data.requirementId } },
      create: {
        organizationId: actor.organizationId,
        projectId: data.projectId,
        requirementId: data.requirementId,
        applicability: data.applicability,
        rationale: data.rationale,
        responsibleRole: data.responsibleRole,
      },
      update: {
        applicability: data.applicability,
        rationale: data.rationale,
        responsibleRole: data.responsibleRole,
      },
    });
    await audit(prisma, actor, "assign_project_requirement", "ProjectRequirement", row.id, {
      applicability: data.applicability,
    });
    return row;
  }
  const row = await prisma.companyRequirement.upsert({
    where: { organizationId_requirementId: { organizationId: actor.organizationId, requirementId: data.requirementId } },
    create: {
      organizationId: actor.organizationId,
      requirementId: data.requirementId,
      applicability: data.applicability,
      rationale: data.rationale,
      responsibleRole: data.responsibleRole,
    },
    update: {
      applicability: data.applicability,
      rationale: data.rationale,
      responsibleRole: data.responsibleRole,
    },
  });
  await audit(prisma, actor, "assign_company_requirement", "CompanyRequirement", row.id, {
    applicability: data.applicability,
  });
  return row;
}

export async function linkEvidence(actor: Actor, input: unknown) {
  assertCan(actor, "write_operations");
  const data = parseInput(evidenceLinkSchema, input);
  if (data.status === "COMPLETED" && data.note.trim().length < 15) throw new AppError("evidence_required");
  const requirement = await prisma.regulatoryRequirement.findUnique({ where: { id: data.requirementId } });
  if (!requirement) throw new AppError("not_found");
  const org = actor.organizationId;
  if (data.projectId) {
    const project = await prisma.project.findFirst({ where: { id: data.projectId, organizationId: org } });
    if (!project) throw new AppError("not_found");
  }
  const links = {
    documentId: null as string | null,
    inspectionId: null as string | null,
    meetingId: null as string | null,
    trainingRecordId: null as string | null,
    incidentId: null as string | null,
  };
  if (data.recordKind === "document") {
    const row = await prisma.safetyDocument.findFirst({ where: { id: data.recordId, organizationId: org } });
    if (!row) throw new AppError("not_found");
    links.documentId = row.id;
  } else if (data.recordKind === "inspection") {
    const row = await prisma.inspection.findFirst({ where: { id: data.recordId, organizationId: org } });
    if (!row) throw new AppError("not_found");
    links.inspectionId = row.id;
  } else if (data.recordKind === "meeting") {
    const row = await prisma.safetyMeeting.findFirst({ where: { id: data.recordId, organizationId: org } });
    if (!row) throw new AppError("not_found");
    links.meetingId = row.id;
  } else if (data.recordKind === "training") {
    const row = await prisma.trainingRecord.findFirst({ where: { id: data.recordId, organizationId: org } });
    if (!row) throw new AppError("not_found");
    links.trainingRecordId = row.id;
  } else {
    const row = await prisma.incidentReport.findFirst({ where: { id: data.recordId, organizationId: org } });
    if (!row) throw new AppError("not_found");
    links.incidentId = row.id;
  }
  const link = await prisma.complianceEvidenceLink.create({
    data: {
      organizationId: org,
      requirementId: data.requirementId,
      projectId: data.projectId,
      status: data.status,
      note: data.note,
      createdById: actor.userId,
      ...links,
    },
  });
  await audit(prisma, actor, "link_evidence", "ComplianceEvidenceLink", link.id, { status: link.status });
  return link;
}

export async function listEvidenceForRequirement(actor: Actor, requirementId: string) {
  return prisma.complianceEvidenceLink.findMany({
    where: { organizationId: actor.organizationId, requirementId },
    orderBy: { createdAt: "desc" },
  });
}

export async function getIipp(actor: Actor) {
  const program = await prisma.iippProgram.findUnique({
    where: { organizationId: actor.organizationId },
    include: { elements: { orderBy: { sortOrder: "asc" } } },
  });
  if (!program) throw new AppError("not_found");
  return program;
}

export async function updateIipp(
  actor: Actor,
  input: { procedures: Record<string, { procedure?: string; responsible?: string }>; claim?: string },
) {
  assertCan(actor, "write_operations");
  const program = await getIipp(actor);
  const claim = (input.claim ?? "").trim();
  let anyContent = claim.length > 0;
  await prisma.$transaction(async (tx) => {
    for (const element of program.elements) {
      const entry = input.procedures[element.key] ?? {};
      const userProcedure = (entry.procedure ?? "").trim().slice(0, 4000) || null;
      const responsibleName = (entry.responsible ?? "").trim().slice(0, 120) || null;
      if (userProcedure || responsibleName) anyContent = true;
      await tx.iippElement.update({
        where: { id: element.id },
        data: { userProcedure, responsibleName },
      });
    }
    await tx.iippProgram.update({
      where: { id: program.id },
      data: {
        status: anyContent ? "IN_PROGRESS" : "TEMPLATE",
        implementationClaim: claim.length >= 10 ? claim.slice(0, 2000) : null,
        claimRecordedAt: claim.length >= 10 ? new Date() : null,
      },
    });
    await audit(tx, actor, "update_iipp", "IippProgram", program.id, { status: anyContent ? "IN_PROGRESS" : "TEMPLATE" });
  });
}

export async function listAudit(actor: Actor) {
  assertCan(actor, "manage_org");
  return prisma.auditEvent.findMany({
    where: { organizationId: actor.organizationId },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { actor: { select: { name: true, email: true } } },
  });
}
