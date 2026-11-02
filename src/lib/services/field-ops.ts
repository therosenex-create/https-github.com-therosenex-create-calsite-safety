import type { Actor } from "../actor";
import { assertCan } from "../authz";
import { prisma } from "../db";
import { AppError } from "../errors";
import { heatPlanSchema, parseInput, payrollDraftSchema, publicWorksSchema, smokePlanSchema } from "../validation";
import { audit, requireProject } from "./common";

async function optionalProject(actor: Actor, projectId: string | null) {
  if (!projectId) return null;
  return requireProject(actor, projectId);
}

export async function createHeatPlan(actor: Actor, input: unknown) {
  assertCan(actor, "write_operations");
  const data = parseInput(heatPlanSchema, input);
  await optionalProject(actor, data.projectId);
  const plan = await prisma.heatIllnessPlan.create({
    data: {
      organizationId: actor.organizationId,
      projectId: data.projectId,
      waterProcedure: data.waterProcedure,
      shadeProcedure: data.shadeProcedure,
      highHeatProcedure: data.highHeatProcedure,
      emergencyProcedure: data.emergencyProcedure,
      trainingNote: data.trainingNote,
      requirementCode: "CCR-T8-3395",
      createdById: actor.userId,
    },
  });
  await audit(prisma, actor, "create_heat_plan", "HeatIllnessPlan", plan.id, {});
  return plan;
}

export async function listHeatPlans(actor: Actor) {
  return prisma.heatIllnessPlan.findMany({
    where: { organizationId: actor.organizationId },
    orderBy: { updatedAt: "desc" },
    include: { project: { select: { name: true } } },
    take: 50,
  });
}

export async function createSmokePlan(actor: Actor, input: unknown) {
  assertCan(actor, "write_operations");
  const data = parseInput(smokePlanSchema, input);
  await optionalProject(actor, data.projectId);
  const plan = await prisma.wildfireSmokePlan.create({
    data: {
      organizationId: actor.organizationId,
      projectId: data.projectId,
      manualCheckProcedure: data.manualCheckProcedure,
      controlNote: data.controlNote,
      respiratorNote: data.respiratorNote,
      requirementCode: "CCR-T8-5141-1",
      createdById: actor.userId,
    },
  });
  await audit(prisma, actor, "create_smoke_plan", "WildfireSmokePlan", plan.id, {});
  return plan;
}

export async function listSmokePlans(actor: Actor) {
  return prisma.wildfireSmokePlan.findMany({
    where: { organizationId: actor.organizationId },
    orderBy: { updatedAt: "desc" },
    include: { project: { select: { name: true } } },
    take: 50,
  });
}

export async function createPublicWorksRecord(actor: Actor, input: unknown) {
  assertCan(actor, "write_operations");
  const data = parseInput(publicWorksSchema, input);
  await requireProject(actor, data.projectId);
  if (data.registrationDocumentId) {
    const document = await prisma.safetyDocument.findFirst({
      where: { id: data.registrationDocumentId, organizationId: actor.organizationId },
    });
    if (!document) throw new AppError("not_found");
  }
  const record = await prisma.publicWorksRecord.create({
    data: {
      organizationId: actor.organizationId,
      projectId: data.projectId,
      awardingBody: data.awardingBody,
      registrationEvidenceNote: data.registrationEvidenceNote,
      registrationDocumentId: data.registrationDocumentId,
      registrationCheckedAt: new Date(),
      wageDeterminationId: data.wageDeterminationId,
      wageNote: data.wageNote,
      apprenticeshipCraft: data.apprenticeshipCraft,
      apprenticeshipNote: data.apprenticeshipNote,
      createdById: actor.userId,
    },
  });
  await audit(prisma, actor, "create_public_works_record", "PublicWorksRecord", record.id, {});
  return record;
}

export async function listPublicWorks(actor: Actor) {
  return prisma.publicWorksRecord.findMany({
    where: { organizationId: actor.organizationId },
    orderBy: { createdAt: "desc" },
    include: { project: { select: { name: true, publicWorksStatus: true } } },
    take: 50,
  });
}

export async function createPayrollDraft(actor: Actor, input: unknown) {
  assertCan(actor, "write_operations");
  const data = parseInput(payrollDraftSchema, input);
  await requireProject(actor, data.projectId);
  const draft = await prisma.certifiedPayrollDraft.create({
    data: {
      organizationId: actor.organizationId,
      projectId: data.projectId,
      weekEnding: data.weekEnding,
      note: data.note,
      submittedToAgency: false,
      createdById: actor.userId,
    },
  });
  if (draft.submittedToAgency) throw new AppError("invalid");
  await audit(prisma, actor, "create_payroll_draft", "CertifiedPayrollDraft", draft.id, { submittedToAgency: false });
  return draft;
}

export async function listPayrollDrafts(actor: Actor) {
  return prisma.certifiedPayrollDraft.findMany({
    where: { organizationId: actor.organizationId },
    orderBy: { weekEnding: "desc" },
    include: { project: { select: { name: true } } },
    take: 50,
  });
}
