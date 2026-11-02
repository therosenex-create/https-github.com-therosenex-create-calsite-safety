import type { Actor } from "../actor";
import { assertCan } from "../authz";
import { prisma } from "../db";
import { AppError } from "../errors";
import {
  contractAcceptSchema,
  contractDocumentSchema,
  contractDraftSchema,
  contractImpactSchema,
  contractTaskSchema,
  parseInput,
} from "../validation";
import { audit } from "./common";
import { createDocument } from "./work";

const DOC_TYPES = ["RFP_RFQ", "PRIME", "SUBCONTRACT", "ADDENDUM", "SPECS", "OTHER"] as const;

export async function createContractDocument(
  actor: Actor,
  input: unknown,
  file?: { name: string; mimeType: string; bytes: Buffer } | null,
) {
  assertCan(actor, "write_operations");
  const data = parseInput(contractDocumentSchema, input);
  const project = await prisma.project.findFirst({ where: { id: data.projectId, organizationId: actor.organizationId } });
  if (!project) throw new AppError("not_found");
  let documentId = data.documentId;
  if (file && file.bytes.byteLength > 0) {
    const created = await createDocument(
      actor,
      { projectId: project.id, title: data.title, category: "other", description: data.notes ?? "" },
      file,
    );
    documentId = created.id;
  }
  if (!documentId) throw new AppError("evidence_required");
  const document = await prisma.safetyDocument.findFirst({
    where: { id: documentId, organizationId: actor.organizationId },
  });
  if (!document || (document.projectId && document.projectId !== project.id)) throw new AppError("not_found");
  const row = await prisma.contractDocument.create({
    data: {
      organizationId: actor.organizationId,
      projectId: project.id,
      documentId: document.id,
      docType: data.docType,
      title: data.title,
      parties: data.parties,
      effectiveOn: data.effectiveOn,
      receivedOn: data.receivedOn,
      revisionLabel: data.revisionLabel,
      notes: data.notes,
      createdById: actor.userId,
    },
  });
  await audit(prisma, actor, "create_contract_document", "ContractDocument", row.id, { docType: row.docType });
  return row;
}

export async function listContractFileOptions(actor: Actor) {
  return prisma.safetyDocument.findMany({
    where: { organizationId: actor.organizationId, archived: false },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, projectId: true },
    take: 100,
  });
}

export async function listContractDocuments(actor: Actor) {
  const [documents, reviews, openTasks] = await Promise.all([
    prisma.contractDocument.findMany({
      where: { organizationId: actor.organizationId },
      orderBy: { createdAt: "desc" },
      include: {
        project: { select: { id: true, name: true } },
        document: { select: { id: true, title: true, fileName: true } },
        drafts: { select: { id: true, status: true } },
      },
      take: 100,
    }),
    prisma.contractImpactReview.findMany({
      where: { organizationId: actor.organizationId },
      select: { contractDocumentId: true, reviewedAt: true, note: true },
    }),
    prisma.complianceTask.findMany({
      where: { organizationId: actor.organizationId, basis: "CONTRACT_ACCEPTED", status: "OPEN" },
      select: { id: true, title: true, projectId: true },
    }),
  ]);
  const reviewed = new Set(reviews.map((review) => review.contractDocumentId));
  const acceptedProjects = new Set(
    documents.filter((document) => document.drafts.some((draft) => draft.status === "ACCEPTED")).map((document) => document.projectId),
  );
  const impact = documents
    .filter((document) => document.docType === "ADDENDUM" && acceptedProjects.has(document.projectId) && !reviewed.has(document.id))
    .map((document) => ({
      contractDocumentId: document.id,
      title: document.title,
      projectId: document.projectId,
      projectName: document.project.name,
      openTasks: openTasks.filter((task) => task.projectId === document.projectId),
    }));
  return { documents, impact };
}

export async function getContractDocument(actor: Actor, id: string) {
  const row = await prisma.contractDocument.findFirst({
    where: { id, organizationId: actor.organizationId },
    include: {
      project: { select: { id: true, name: true } },
      document: { select: { id: true, title: true, fileName: true } },
      drafts: {
        orderBy: { createdAt: "asc" },
        include: {
          requirement: { select: { id: true, citation: true } },
          acceptedBy: { select: { name: true } },
          task: { select: { id: true, title: true, status: true, dueAt: true, evidenceDocumentId: true } },
          localRuleNote: { select: { id: true, reviewStatus: true } },
        },
      },
      impactReviews: { orderBy: { reviewedAt: "desc" }, include: { reviewer: { select: { name: true } } } },
    },
  });
  if (!row) throw new AppError("not_found");
  return row;
}

export async function createContractDraft(actor: Actor, input: unknown) {
  assertCan(actor, "write_operations");
  const data = parseInput(contractDraftSchema, input);
  const document = await prisma.contractDocument.findFirst({
    where: { id: data.contractDocumentId, organizationId: actor.organizationId },
  });
  if (!document) throw new AppError("not_found");
  if (data.requirementId) {
    const requirement = await prisma.regulatoryRequirement.findUnique({ where: { id: data.requirementId } });
    if (!requirement) throw new AppError("not_found");
  }
  const before = await prisma.regulatoryRequirement.count();
  const tasksBefore = await prisma.complianceTask.count({ where: { organizationId: actor.organizationId } });
  const draft = await prisma.contractDraft.create({
    data: {
      organizationId: actor.organizationId,
      projectId: document.projectId,
      contractDocumentId: document.id,
      clauseReference: data.clauseReference,
      quote: data.quote,
      requirementId: data.requirementId,
      status: "DRAFT",
      createdById: actor.userId,
    },
  });
  if ((await prisma.regulatoryRequirement.count()) !== before) throw new AppError("invalid");
  if ((await prisma.complianceTask.count({ where: { organizationId: actor.organizationId } })) !== tasksBefore) {
    throw new AppError("invalid");
  }
  await audit(prisma, actor, "create_contract_draft", "ContractDraft", draft.id, { status: "DRAFT" });
  return draft;
}

export async function acceptContractDraft(actor: Actor, input: unknown) {
  assertCan(actor, "write_operations");
  const data = parseInput(contractAcceptSchema, input);
  const draft = await prisma.contractDraft.findFirst({
    where: { id: data.draftId, organizationId: actor.organizationId, status: "DRAFT" },
    include: { contractDocument: true, requirement: true },
  });
  if (!draft) throw new AppError("not_found");
  if (!draft.contractDocumentId || !draft.contractDocument.documentId) throw new AppError("evidence_required");
  const catalogBefore = draft.requirement
    ? { plainLanguageEn: draft.requirement.plainLanguageEn, reviewStatus: draft.requirement.reviewStatus, citation: draft.requirement.citation }
    : null;
  const requirementCount = await prisma.regulatoryRequirement.count();
  const result = await prisma.$transaction(async (tx) => {
    let localRuleNoteId: string | null = null;
    if (draft.requirementId) {
      await tx.projectRequirement.upsert({
        where: { projectId_requirementId: { projectId: draft.projectId, requirementId: draft.requirementId } },
        create: {
          organizationId: actor.organizationId,
          projectId: draft.projectId,
          requirementId: draft.requirementId,
          applicability: "CONTRACTUALLY_REQUIRED",
          rationale: data.reason,
        },
        update: { applicability: "CONTRACTUALLY_REQUIRED", rationale: data.reason },
      });
    } else {
      const note = await tx.localRuleNote.create({
        data: {
          organizationId: actor.organizationId,
          projectId: draft.projectId,
          topic: "CONTRACT",
          ruleText: draft.quote,
          rationale: data.reason,
          reviewStatus: "PENDING_QUALIFIED_REVIEW",
          documentId: draft.contractDocument.documentId,
          createdById: actor.userId,
        },
      });
      localRuleNoteId = note.id;
    }
    const task = await tx.complianceTask.create({
      data: {
        organizationId: actor.organizationId,
        projectId: draft.projectId,
        requirementId: draft.requirementId,
        title: draft.clauseReference.slice(0, 180),
        dueAt: data.dueOn,
        basis: "CONTRACT_ACCEPTED",
        basisNote: draft.quote,
        status: "OPEN",
      },
    });
    const updated = await tx.contractDraft.update({
      where: { id: draft.id },
      data: {
        status: "ACCEPTED",
        acceptReason: data.reason,
        acceptedById: actor.userId,
        acceptedAt: new Date(),
        localRuleNoteId,
        taskId: task.id,
      },
      include: { contractDocument: true, task: true },
    });
    if ((await tx.regulatoryRequirement.count()) !== requirementCount) throw new AppError("invalid");
    if (draft.requirementId && catalogBefore) {
      const after = await tx.regulatoryRequirement.findUniqueOrThrow({ where: { id: draft.requirementId } });
      if (after.plainLanguageEn !== catalogBefore.plainLanguageEn || after.reviewStatus !== catalogBefore.reviewStatus || after.citation !== catalogBefore.citation) {
        throw new AppError("invalid");
      }
    }
    return updated;
  });
  await audit(prisma, actor, "accept_contract_draft", "ContractDraft", result.id, { taskId: result.taskId });
  return result;
}

export async function updateContractTask(actor: Actor, input: unknown) {
  assertCan(actor, "write_operations");
  const data = parseInput(contractTaskSchema, input);
  const task = await prisma.complianceTask.findFirst({
    where: { id: data.taskId, organizationId: actor.organizationId, basis: "CONTRACT_ACCEPTED" },
  });
  if (!task) throw new AppError("not_found");
  if (data.documentId) {
    const document = await prisma.safetyDocument.findFirst({
      where: { id: data.documentId, organizationId: actor.organizationId },
    });
    if (!document) throw new AppError("not_found");
  }
  const updated = await prisma.complianceTask.update({
    where: { id: task.id },
    data: { status: data.status, evidenceDocumentId: data.documentId },
  });
  await audit(prisma, actor, "update_contract_task", "ComplianceTask", updated.id, { status: updated.status });
  return updated;
}

export async function recordAddendumReview(actor: Actor, input: unknown) {
  assertCan(actor, "write_operations");
  const data = parseInput(contractImpactSchema, input);
  const document = await prisma.contractDocument.findFirst({
    where: { id: data.contractDocumentId, organizationId: actor.organizationId },
  });
  if (!document || document.docType !== "ADDENDUM") throw new AppError("not_found");
  const accepted = await prisma.contractDraft.count({
    where: { organizationId: actor.organizationId, projectId: document.projectId, status: "ACCEPTED" },
  });
  if (accepted < 1) throw new AppError("invalid");
  const review = await prisma.contractImpactReview.create({
    data: {
      organizationId: actor.organizationId,
      projectId: document.projectId,
      contractDocumentId: document.id,
      note: data.note,
      reviewedById: actor.userId,
    },
  });
  await audit(prisma, actor, "review_addendum_impact", "ContractImpactReview", review.id, {});
  return review;
}

export { DOC_TYPES };
