import { Prisma, type PrismaClient } from "@prisma/client";
import type { Actor } from "../actor";
import { prisma } from "../db";
import { AppError } from "../errors";

type Writer = Prisma.TransactionClient | PrismaClient;

export async function audit(
  db: Writer,
  actor: Actor,
  action: string,
  entityType: string,
  entityId: string,
  metadata: Prisma.InputJsonValue = {},
) {
  await db.auditEvent.create({
    data: {
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
      actorRole: actor.role,
      action,
      entityType,
      entityId,
      metadata,
    },
  });
}

export async function requireProject(actor: Actor, projectId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId: actor.organizationId },
  });
  if (!project) throw new AppError("not_found");
  return project;
}

export async function requireEmployee(actor: Actor, employeeId: string) {
  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, organizationId: actor.organizationId },
  });
  if (!employee) throw new AppError("not_found");
  return employee;
}

export async function requireMeeting(actor: Actor, meetingId: string) {
  const meeting = await prisma.safetyMeeting.findFirst({
    where: { id: meetingId, organizationId: actor.organizationId },
  });
  if (!meeting) throw new AppError("not_found");
  return meeting;
}

export async function requireInspection(actor: Actor, inspectionId: string) {
  const inspection = await prisma.inspection.findFirst({
    where: { id: inspectionId, organizationId: actor.organizationId },
  });
  if (!inspection) throw new AppError("not_found");
  return inspection;
}

export function slugify(name: string) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base || "company"}-${suffix}`;
}
