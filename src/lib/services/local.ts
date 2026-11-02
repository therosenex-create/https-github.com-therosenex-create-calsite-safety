import type { Actor } from "../actor";
import { assertCan } from "../authz";
import { prisma } from "../db";
import { AppError } from "../errors";
import { closeoutSchema, localRuleSchema, parseInput } from "../validation";
import { audit, requireProject } from "./common";

const CLOSEOUT_KEYS = [
  "REGISTRATION_NOTE",
  "DETERMINATION_ID",
  "PAYROLL_DRAFTS",
  "APPRENTICESHIP_NOTE",
  "FINAL_PAYROLL",
  "FINAL_DOCS",
  "SIGNOFF",
] as const;

export type CloseoutKey = (typeof CLOSEOUT_KEYS)[number];

async function ownDocument(actor: Actor, documentId: string | null) {
  if (!documentId) return;
  const document = await prisma.safetyDocument.findFirst({
    where: { id: documentId, organizationId: actor.organizationId },
  });
  if (!document) throw new AppError("not_found");
}

export async function createLocalRule(actor: Actor, input: unknown) {
  assertCan(actor, "write_operations");
  const data = parseInput(localRuleSchema, input);
  if (data.projectId) await requireProject(actor, data.projectId);
  await ownDocument(actor, data.documentId);
  if (data.requirementId) {
    const requirement = await prisma.regulatoryRequirement.findUnique({ where: { id: data.requirementId } });
    if (!requirement) throw new AppError("not_found");
  }
  const status = data.reviewStatus ?? "PENDING_QUALIFIED_REVIEW";
  if (status !== "PENDING_QUALIFIED_REVIEW" && status !== "UNREVIEWED" && (data.rationale ?? "").trim().length < 20) {
    throw new AppError("rationale_required");
  }
  const before = await prisma.regulatoryRequirement.count();
  const note = await prisma.localRuleNote.create({
    data: {
      organizationId: actor.organizationId,
      projectId: data.projectId,
      requirementId: data.requirementId,
      topic: data.topic,
      ruleText: data.ruleText,
      citationUrl: data.citationUrl,
      rationale: data.rationale,
      reviewStatus: status,
      documentId: data.documentId,
      createdById: actor.userId,
    },
  });
  if ((await prisma.regulatoryRequirement.count()) !== before) throw new AppError("invalid");
  await audit(prisma, actor, "create_local_rule", "LocalRuleNote", note.id, { topic: note.topic, reviewStatus: note.reviewStatus });
  return note;
}

export async function listLocalRules(actor: Actor) {
  return prisma.localRuleNote.findMany({
    where: { organizationId: actor.organizationId },
    orderBy: { updatedAt: "desc" },
    include: { project: { select: { name: true } }, requirement: { select: { code: true, citation: true } } },
    take: 100,
  });
}

function satisfied(note: string | null | undefined, documentId: string | null | undefined) {
  return (note ?? "").trim().length >= 10 || Boolean(documentId);
}

export async function getCloseout(actor: Actor, projectId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId: actor.organizationId },
  });
  if (!project) throw new AppError("not_found");
  const [items, records, drafts] = await Promise.all([
    prisma.closeoutItem.findMany({ where: { organizationId: actor.organizationId, projectId } }),
    prisma.publicWorksRecord.findMany({ where: { organizationId: actor.organizationId, projectId } }),
    prisma.certifiedPayrollDraft.findMany({ where: { organizationId: actor.organizationId, projectId }, orderBy: { weekEnding: "desc" } }),
  ]);
  const byKey = new Map(items.map((item) => [item.itemKey, item]));
  const registration = records.some((record) => record.registrationEvidenceNote.trim().length >= 20);
  const determination = records.some((record) => (record.wageDeterminationId ?? "").trim().length > 0);
  const apprenticeship = records.some((record) => (record.apprenticeshipNote ?? "").trim().length >= 10);
  return CLOSEOUT_KEYS.map((key) => {
    const item = byKey.get(key);
    const fromRecord =
      (key === "REGISTRATION_NOTE" && registration) ||
      (key === "DETERMINATION_ID" && determination) ||
      (key === "APPRENTICESHIP_NOTE" && apprenticeship);
    const fromItem = item ? satisfied(item.note, item.documentId) : false;
    const signoffOk =
      key !== "SIGNOFF" ||
      (Boolean(item?.acknowledgedNotASignature) && (item?.signoffName ?? "").trim().length >= 2 && satisfied(item?.note, item?.documentId));
    const complete = key === "SIGNOFF" ? signoffOk : fromRecord || fromItem;
    return {
      key,
      complete: Boolean(complete),
      note: item?.note ?? null,
      documentId: item?.documentId ?? null,
      signoffName: item?.signoffName ?? null,
      recordedAt: item?.recordedAt ?? null,
      draftCount: key === "PAYROLL_DRAFTS" ? drafts.length : 0,
      submittedDrafts: drafts.filter((draft) => draft.submittedToAgency).length,
    };
  });
}

export async function saveCloseoutItem(actor: Actor, input: unknown) {
  assertCan(actor, "write_operations");
  const data = parseInput(closeoutSchema, input);
  await requireProject(actor, data.projectId);
  await ownDocument(actor, data.documentId);
  const acknowledged = data.acknowledgedNotASignature === "yes";
  if (data.itemKey === "SIGNOFF") {
    if (!acknowledged) throw new AppError("acknowledge_required");
    if ((data.signoffName ?? "").trim().length < 2 || !satisfied(data.note, data.documentId)) {
      throw new AppError("evidence_required");
    }
  } else if (!satisfied(data.note, data.documentId)) {
    throw new AppError("evidence_required");
  }
  const item = await prisma.closeoutItem.upsert({
    where: { projectId_itemKey: { projectId: data.projectId, itemKey: data.itemKey } },
    create: {
      organizationId: actor.organizationId,
      projectId: data.projectId,
      itemKey: data.itemKey,
      note: data.note,
      documentId: data.documentId,
      signoffName: data.signoffName,
      acknowledgedNotASignature: acknowledged,
      recordedAt: new Date(),
    },
    update: {
      note: data.note,
      documentId: data.documentId,
      signoffName: data.signoffName,
      acknowledgedNotASignature: acknowledged,
      recordedAt: new Date(),
    },
  });
  await audit(prisma, actor, "save_closeout_item", "CloseoutItem", item.id, { itemKey: item.itemKey });
  return item;
}
