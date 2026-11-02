import type { Actor } from "../actor";
import { prisma } from "../db";
import { AppError } from "../errors";
import { getCloseout } from "./local";

const DAY = 24 * 60 * 60 * 1000;

export function containsScoreKey(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some((item) => containsScoreKey(item));
  return Object.entries(value as Record<string, unknown>).some(([key, child]) => /score/i.test(key) || containsScoreKey(child));
}

export async function getProjectDashboard(actor: Actor, projectId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId: actor.organizationId },
    select: { id: true, name: true },
  });
  if (!project) throw new AppError("not_found");
  const worker = actor.role === "WORKER";
  const horizon = new Date(Date.now() + 30 * DAY);
  const now = new Date();
  const [actions, actionCount, incidents, incidentCount, trainings, permits, pending, closeout] = await Promise.all([
    prisma.correctiveAction.findMany({
      where: { organizationId: actor.organizationId, status: "OPEN", finding: { inspection: { projectId } } },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, description: true, finding: { select: { inspectionId: true } } },
    }),
    prisma.correctiveAction.count({
      where: { organizationId: actor.organizationId, status: "OPEN", finding: { inspection: { projectId } } },
    }),
    prisma.incidentReport.findMany({
      where: {
        organizationId: actor.organizationId,
        projectId,
        status: { in: ["OPEN", "UNDER_REVIEW"] },
        ...(worker ? { createdById: actor.userId } : {}),
      },
      orderBy: { occurredAt: "desc" },
      take: 20,
      select: { id: true, type: true },
    }),
    prisma.incidentReport.count({
      where: {
        organizationId: actor.organizationId,
        projectId,
        status: { in: ["OPEN", "UNDER_REVIEW"] },
        ...(worker ? { createdById: actor.userId } : {}),
      },
    }),
    prisma.trainingRecord.findMany({
      where: {
        organizationId: actor.organizationId,
        projectId,
        status: "RECORDED",
        expiresOn: { lte: horizon },
        ...(worker ? { employee: { email: actor.email } } : {}),
      },
      orderBy: { expiresOn: "asc" },
      take: 20,
      select: { id: true, topic: true, expiresOn: true },
    }),
    prisma.permitRecord.findMany({
      where: { organizationId: actor.organizationId, projectId },
      orderBy: { updatedAt: "desc" },
      select: { id: true, status: true, permitType: true },
    }),
    prisma.projectRequirement.findMany({
      where: { organizationId: actor.organizationId, projectId, applicability: "PENDING_QUALIFIED_REVIEW" },
      include: { requirement: { select: { id: true, citation: true } } },
    }),
    getCloseout(actor, projectId),
  ]);
  const byStatus: Record<string, number> = {};
  for (const permit of permits) byStatus[permit.status] = (byStatus[permit.status] ?? 0) + 1;
  const incomplete = closeout.filter((item) => !item.complete);
  const dashboard = {
    projectId: project.id,
    projectName: project.name,
    openCorrectiveActions: {
      count: actionCount,
      items: actions.map((action) => ({
        id: action.id,
        inspectionId: action.finding.inspectionId,
        description: action.description,
      })),
    },
    openIncidents: { count: incidentCount, items: incidents },
    trainingPointers: {
      count: trainings.length,
      items: trainings.map((row) => ({
        id: row.id,
        topic: row.topic,
        expiresOn: row.expiresOn,
        kind: row.expiresOn && row.expiresOn < now ? ("expired" as const) : ("expiring" as const),
      })),
    },
    permits: {
      count: permits.length,
      byStatus,
      items: permits.map((permit) => ({ id: permit.id, status: permit.status, permitType: permit.permitType })),
    },
    closeoutIncomplete: { count: incomplete.length, keys: incomplete.map((item) => item.key) },
    pendingApplicability: {
      count: pending.length,
      items: pending.map((row) => ({
        id: row.requirement.id,
        citation: row.requirement.citation,
        applicability: row.applicability,
      })),
    },
  };
  if (containsScoreKey(dashboard)) throw new AppError("invalid");
  return dashboard;
}
