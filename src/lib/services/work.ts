import type { Prisma } from "@prisma/client";
import type { Actor } from "../actor";
import { assertCan } from "../authz";
import { promptsFor } from "../checklists";
import { prisma } from "../db";
import { AppError } from "../errors";
import { assertAllowedFile, safeFileName } from "../files";
import { sha256 } from "../fingerprint";
import { getBlobStore, readStoredBlob } from "../storage";
import { pageArgs, type Page } from "../pagination";
import {
  correctiveActionSchema,
  documentSchema,
  employeeSchema,
  findingSchema,
  incidentSchema,
  inspectionSchema,
  meetingSchema,
  parseInput,
  projectSchema,
  trainingSchema,
  type CorrectiveInput,
} from "../validation";
import { audit, requireEmployee, requireInspection, requireMeeting, requireProject } from "./common";

const USER_DATE_NOTE = "Due date was entered by a user. It was not calculated from a statute.";

function search(q?: string) {
  const value = q?.trim();
  if (!value) return undefined;
  return value.slice(0, 80);
}

export async function createProject(actor: Actor, input: unknown) {
  assertCan(actor, "write_operations");
  const data = parseInput(projectSchema, input);
  const project = await prisma.project.create({
    data: {
      organizationId: actor.organizationId,
      name: data.name,
      jobsiteName: data.jobsiteName,
      streetAddress: data.streetAddress,
      city: data.city,
      county: data.county,
      state: data.state,
      postalCode: data.postalCode,
      ownerType: data.ownerType,
      ownerName: data.ownerName,
      publicWorksStatus: data.publicWorksStatus,
      publicWorksRationale: data.publicWorksRationale.trim() ? data.publicWorksRationale.trim() : null,
      description: data.description,
      scopeOfWork: data.scopeOfWork,
      status: data.status,
      startDate: data.startDate,
      endDate: data.endDate,
      jurisdictionConfirmed: data.jurisdictionConfirmed,
    },
  });
  await audit(prisma, actor, "create_project", "Project", project.id, { status: project.status });
  return project;
}

export async function updateProject(actor: Actor, id: string, input: unknown) {
  assertCan(actor, "write_operations");
  await requireProject(actor, id);
  const data = parseInput(projectSchema, input);
  const project = await prisma.project.update({
    where: { id },
    data: {
      name: data.name,
      jobsiteName: data.jobsiteName,
      streetAddress: data.streetAddress,
      city: data.city,
      county: data.county,
      state: data.state,
      postalCode: data.postalCode,
      ownerType: data.ownerType,
      ownerName: data.ownerName,
      publicWorksStatus: data.publicWorksStatus,
      publicWorksRationale: data.publicWorksRationale.trim() ? data.publicWorksRationale.trim() : null,
      description: data.description,
      scopeOfWork: data.scopeOfWork,
      status: data.status,
      startDate: data.startDate,
      endDate: data.endDate,
      jurisdictionConfirmed: data.jurisdictionConfirmed,
    },
  });
  await audit(prisma, actor, "update_project", "Project", project.id, { status: project.status });
  return project;
}

export async function archiveProject(actor: Actor, id: string) {
  assertCan(actor, "write_operations");
  await requireProject(actor, id);
  const project = await prisma.project.update({ where: { id }, data: { status: "ARCHIVED" } });
  await audit(prisma, actor, "archive_project", "Project", id, {});
  return project;
}

export async function listProjects(actor: Actor, opts: { page?: string; q?: string; archived?: boolean } = {}): Promise<Page<Awaited<ReturnType<typeof prisma.project.findMany>>[number]>> {
  const paging = pageArgs(opts.page);
  const q = search(opts.q);
  const where = {
    organizationId: actor.organizationId,
    ...(opts.archived ? { status: "ARCHIVED" as const } : { status: { not: "ARCHIVED" as const } }),
    ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.project.findMany({ where, orderBy: { updatedAt: "desc" }, skip: paging.skip, take: paging.take }),
    prisma.project.count({ where }),
  ]);
  return { items, total, page: paging.page, pageSize: paging.pageSize };
}

export async function getProject(actor: Actor, id: string) {
  const project = await prisma.project.findFirst({
    where: { id, organizationId: actor.organizationId },
    include: {
      assignments: { include: { employee: true }, orderBy: { createdAt: "asc" } },
      requirements: { include: { requirement: true }, orderBy: { updatedAt: "desc" } },
    },
  });
  if (!project) throw new AppError("not_found");
  return project;
}

export async function assignCrew(actor: Actor, projectId: string, employeeId: string) {
  assertCan(actor, "write_operations");
  await requireProject(actor, projectId);
  await requireEmployee(actor, employeeId);
  const row = await prisma.projectAssignment.upsert({
    where: { projectId_employeeId: { projectId, employeeId } },
    create: { organizationId: actor.organizationId, projectId, employeeId },
    update: {},
  });
  await audit(prisma, actor, "assign_crew", "ProjectAssignment", row.id, {});
  return row;
}

export async function removeCrew(actor: Actor, projectId: string, employeeId: string) {
  assertCan(actor, "write_operations");
  await requireProject(actor, projectId);
  const row = await prisma.projectAssignment.findFirst({
    where: { projectId, employeeId, organizationId: actor.organizationId },
  });
  if (!row) throw new AppError("not_found");
  await prisma.projectAssignment.delete({ where: { id: row.id } });
  await audit(prisma, actor, "remove_crew", "ProjectAssignment", row.id, {});
}

async function assertEmployeeEmail(actor: Actor, email: string | null, ignoreId?: string) {
  if (!email) return;
  const existing = await prisma.employee.findFirst({
    where: {
      organizationId: actor.organizationId,
      email,
      status: { not: "ARCHIVED" },
      ...(ignoreId ? { NOT: { id: ignoreId } } : {}),
    },
  });
  if (existing) throw new AppError("duplicate_email");
}

export function toEmployeeView<T extends { email: string | null; phone: string | null }>(actor: Actor, employee: T) {
  const elevated = actor.role !== "WORKER";
  const self = Boolean(employee.email && employee.email === actor.email);
  if (elevated || self) return employee;
  return { ...employee, email: null, phone: null };
}

export async function createEmployee(actor: Actor, input: unknown) {
  assertCan(actor, "write_operations");
  const data = parseInput(employeeSchema, input);
  await assertEmployeeEmail(actor, data.email);
  const employee = await prisma.employee.create({
    data: { organizationId: actor.organizationId, ...data },
  });
  await audit(prisma, actor, "create_employee", "Employee", employee.id, {});
  return employee;
}

export async function updateEmployee(actor: Actor, id: string, input: unknown) {
  assertCan(actor, "write_operations");
  await requireEmployee(actor, id);
  const data = parseInput(employeeSchema, input);
  await assertEmployeeEmail(actor, data.email, id);
  const employee = await prisma.employee.update({ where: { id }, data });
  await audit(prisma, actor, "update_employee", "Employee", id, {});
  return employee;
}

export async function archiveEmployee(actor: Actor, id: string) {
  assertCan(actor, "write_operations");
  await requireEmployee(actor, id);
  const employee = await prisma.employee.update({ where: { id }, data: { status: "ARCHIVED" } });
  await audit(prisma, actor, "archive_employee", "Employee", id, {});
  return employee;
}

export async function listEmployees(actor: Actor, opts: { page?: string; q?: string; archived?: boolean } = {}) {
  const paging = pageArgs(opts.page);
  const q = search(opts.q);
  const where = {
    organizationId: actor.organizationId,
    ...(opts.archived ? { status: "ARCHIVED" as const } : { status: { not: "ARCHIVED" as const } }),
    ...(q
      ? {
          OR: [
            { firstName: { contains: q, mode: "insensitive" as const } },
            { lastName: { contains: q, mode: "insensitive" as const } },
            { trade: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.employee.findMany({ where, orderBy: [{ lastName: "asc" }, { firstName: "asc" }], skip: paging.skip, take: paging.take }),
    prisma.employee.count({ where }),
  ]);
  return { items: rows.map((row) => toEmployeeView(actor, row)), total, page: paging.page, pageSize: paging.pageSize };
}

export async function listProjectOptions(actor: Actor) {
  return prisma.project.findMany({
    where: { organizationId: actor.organizationId, status: { not: "ARCHIVED" } },
    orderBy: { name: "asc" },
    take: 200,
    select: { id: true, name: true },
  });
}

export async function listEmployeeOptions(actor: Actor) {
  const rows = await prisma.employee.findMany({
    where: { organizationId: actor.organizationId, status: "ACTIVE" },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    take: 200,
    select: { id: true, firstName: true, lastName: true, trade: true },
  });
  return rows;
}

export async function getEmployee(actor: Actor, id: string) {
  const employee = await requireEmployee(actor, id);
  return toEmployeeView(actor, employee);
}

async function createUserTask(
  actor: Actor,
  data: { title: string; projectId?: string | null; dueAt?: Date | null; correctiveActionId?: string | null },
) {
  return prisma.complianceTask.create({
    data: {
      organizationId: actor.organizationId,
      projectId: data.projectId ?? null,
      correctiveActionId: data.correctiveActionId ?? null,
      title: data.title.slice(0, 180),
      dueAt: data.dueAt ?? null,
      basis: "USER_ENTERED",
      basisNote: USER_DATE_NOTE,
    },
  });
}

export async function createMeeting(actor: Actor, input: unknown) {
  assertCan(actor, "write_operations");
  const data = parseInput(meetingSchema, input);
  if (data.projectId) await requireProject(actor, data.projectId);
  const meeting = await prisma.safetyMeeting.create({
    data: {
      organizationId: actor.organizationId,
      createdById: actor.userId,
      projectId: data.projectId,
      title: data.title,
      topic: data.topic,
      language: data.language,
      scheduledAt: data.scheduledAt,
      leaderName: data.leaderName,
      policyBasis: data.policyBasis,
      requirementCode: data.requirementCode,
      discussionPoints: data.discussionPoints,
      workerQuestions: data.workerQuestions,
      followUp: data.followUp,
      notes: data.notes,
      status: data.status,
    },
  });
  if (data.followUp) {
    await createUserTask(actor, { title: data.followUp, projectId: data.projectId });
  }
  await audit(prisma, actor, "create_meeting", "SafetyMeeting", meeting.id, { policyBasis: meeting.policyBasis });
  return meeting;
}

export async function updateMeeting(actor: Actor, id: string, input: unknown) {
  assertCan(actor, "write_operations");
  const existing = await requireMeeting(actor, id);
  const data = parseInput(meetingSchema, input);
  if (data.projectId) await requireProject(actor, data.projectId);
  const meeting = await prisma.safetyMeeting.update({
    where: { id },
    data: {
      projectId: data.projectId,
      title: data.title,
      topic: data.topic,
      language: data.language,
      scheduledAt: data.scheduledAt,
      leaderName: data.leaderName,
      policyBasis: data.policyBasis,
      requirementCode: data.requirementCode,
      discussionPoints: data.discussionPoints,
      workerQuestions: data.workerQuestions,
      followUp: data.followUp,
      notes: data.notes,
      status: data.status,
    },
  });
  if (data.followUp && data.followUp !== existing.followUp) {
    await createUserTask(actor, { title: data.followUp, projectId: data.projectId });
  }
  await audit(prisma, actor, "update_meeting", "SafetyMeeting", id, {});
  return meeting;
}

export async function archiveMeeting(actor: Actor, id: string) {
  assertCan(actor, "write_operations");
  await requireMeeting(actor, id);
  await prisma.safetyMeeting.update({ where: { id }, data: { status: "ARCHIVED" } });
  await audit(prisma, actor, "archive_meeting", "SafetyMeeting", id, {});
}

export async function listMeetings(actor: Actor, opts: { page?: string; archived?: boolean } = {}) {
  const paging = pageArgs(opts.page);
  const where = {
    organizationId: actor.organizationId,
    ...(opts.archived ? { status: "ARCHIVED" as const } : { status: { not: "ARCHIVED" as const } }),
  };
  const [items, total] = await Promise.all([
    prisma.safetyMeeting.findMany({
      where,
      orderBy: { scheduledAt: "desc" },
      skip: paging.skip,
      take: paging.take,
      include: { project: { select: { name: true } }, _count: { select: { attendance: true } } },
    }),
    prisma.safetyMeeting.count({ where }),
  ]);
  return { items, total, page: paging.page, pageSize: paging.pageSize };
}

export async function getMeeting(actor: Actor, id: string) {
  const meeting = await prisma.safetyMeeting.findFirst({
    where: { id, organizationId: actor.organizationId },
    include: {
      project: { select: { id: true, name: true } },
      attendance: { include: { employee: { select: { id: true, firstName: true, lastName: true, email: true } } } },
    },
  });
  if (!meeting) throw new AppError("not_found");
  return meeting;
}

export async function setAttendance(actor: Actor, meetingId: string, employeeIds: string[]) {
  assertCan(actor, "write_operations");
  await requireMeeting(actor, meetingId);
  const unique = [...new Set(employeeIds.filter(Boolean))];
  const employees = await prisma.employee.findMany({
    where: { organizationId: actor.organizationId, id: { in: unique }, status: "ACTIVE" },
  });
  if (employees.length !== unique.length) throw new AppError("not_found");
  await prisma.$transaction(async (tx) => {
    await tx.meetingAttendance.deleteMany({ where: { meetingId, organizationId: actor.organizationId } });
    if (unique.length) {
      await tx.meetingAttendance.createMany({
        data: unique.map((employeeId) => ({
          organizationId: actor.organizationId,
          meetingId,
          employeeId,
          present: true,
          acknowledgedAt: new Date(),
          method: "onscreen_checkbox",
        })),
      });
    }
    await audit(tx, actor, "set_attendance", "SafetyMeeting", meetingId, { count: unique.length });
  });
}

export async function acknowledgeOwnAttendance(actor: Actor, meetingId: string) {
  assertCan(actor, "acknowledge_meeting");
  await requireMeeting(actor, meetingId);
  const employee = await prisma.employee.findFirst({
    where: { organizationId: actor.organizationId, email: actor.email, status: "ACTIVE" },
  });
  if (!employee) throw new AppError("not_found");
  const row = await prisma.meetingAttendance.upsert({
    where: { meetingId_employeeId: { meetingId, employeeId: employee.id } },
    create: {
      organizationId: actor.organizationId,
      meetingId,
      employeeId: employee.id,
      present: true,
      acknowledgedAt: new Date(),
      method: "onscreen_checkbox",
    },
    update: { present: true, acknowledgedAt: new Date(), method: "onscreen_checkbox" },
  });
  await audit(prisma, actor, "acknowledge_attendance", "MeetingAttendance", row.id, {});
  return row;
}

export async function createTraining(actor: Actor, input: unknown) {
  assertCan(actor, "write_operations");
  const data = parseInput(trainingSchema, input);
  await requireEmployee(actor, data.employeeId);
  if (data.projectId) await requireProject(actor, data.projectId);
  const record = await prisma.trainingRecord.create({
    data: {
      organizationId: actor.organizationId,
      createdById: actor.userId,
      employeeId: data.employeeId,
      projectId: data.projectId,
      topic: data.topic,
      provider: data.provider,
      completedOn: data.completedOn,
      expiresOn: data.expiresOn,
      evidenceNote: data.evidenceNote,
    },
  });
  await audit(prisma, actor, "create_training", "TrainingRecord", record.id, {});
  return record;
}

export async function updateTraining(actor: Actor, id: string, input: unknown) {
  assertCan(actor, "write_operations");
  const existing = await prisma.trainingRecord.findFirst({ where: { id, organizationId: actor.organizationId } });
  if (!existing) throw new AppError("not_found");
  const data = parseInput(trainingSchema, input);
  await requireEmployee(actor, data.employeeId);
  if (data.projectId) await requireProject(actor, data.projectId);
  const record = await prisma.trainingRecord.update({
    where: { id },
    data: {
      employeeId: data.employeeId,
      projectId: data.projectId,
      topic: data.topic,
      provider: data.provider,
      completedOn: data.completedOn,
      expiresOn: data.expiresOn,
      evidenceNote: data.evidenceNote,
    },
  });
  await audit(prisma, actor, "update_training", "TrainingRecord", id, {});
  return record;
}

export async function archiveTraining(actor: Actor, id: string) {
  assertCan(actor, "write_operations");
  const existing = await prisma.trainingRecord.findFirst({ where: { id, organizationId: actor.organizationId } });
  if (!existing) throw new AppError("not_found");
  await prisma.trainingRecord.update({ where: { id }, data: { status: "ARCHIVED" } });
  await audit(prisma, actor, "archive_training", "TrainingRecord", id, {});
}

export async function listTraining(actor: Actor, opts: { page?: string; archived?: boolean } = {}) {
  const paging = pageArgs(opts.page);
  const where = {
    organizationId: actor.organizationId,
    ...(opts.archived ? { status: "ARCHIVED" as const } : { status: "RECORDED" as const }),
    ...(actor.role === "WORKER" ? { employee: { email: actor.email } } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.trainingRecord.findMany({
      where,
      orderBy: { completedOn: "desc" },
      skip: paging.skip,
      take: paging.take,
      include: { employee: { select: { firstName: true, lastName: true } }, project: { select: { name: true } } },
    }),
    prisma.trainingRecord.count({ where }),
  ]);
  return { items, total, page: paging.page, pageSize: paging.pageSize };
}

export async function getTraining(actor: Actor, id: string) {
  const record = await prisma.trainingRecord.findFirst({
    where: {
      id,
      organizationId: actor.organizationId,
      ...(actor.role === "WORKER" ? { employee: { email: actor.email } } : {}),
    },
    include: { employee: true, project: { select: { id: true, name: true } } },
  });
  if (!record) throw new AppError("not_found");
  return { ...record, employee: toEmployeeView(actor, record.employee) };
}

export async function createInspection(actor: Actor, input: unknown) {
  assertCan(actor, "write_operations");
  const data = parseInput(inspectionSchema, input);
  await requireProject(actor, data.projectId);
  if (data.status === "CLOSED") {
    // A new inspection has no findings, so closing it only records that nothing was left open.
  }
  const inspection = await prisma.inspection.create({
    data: {
      organizationId: actor.organizationId,
      createdById: actor.userId,
      projectId: data.projectId,
      category: data.category,
      inspectedAt: data.inspectedAt,
      inspectorName: data.inspectorName,
      location: data.location,
      summary: data.summary,
      status: data.status,
      checklist: [],
    },
  });
  await audit(prisma, actor, "create_inspection", "Inspection", inspection.id, { category: inspection.category });
  return inspection;
}

export async function updateInspection(actor: Actor, id: string, input: unknown) {
  assertCan(actor, "write_operations");
  await requireInspection(actor, id);
  const data = parseInput(inspectionSchema, input);
  await requireProject(actor, data.projectId);
  if (data.status === "CLOSED") {
    const open = await prisma.finding.count({ where: { inspectionId: id, status: "OPEN" } });
    if (open > 0) throw new AppError("open_findings");
  }
  const inspection = await prisma.inspection.update({
    where: { id },
    data: {
      projectId: data.projectId,
      category: data.category,
      inspectedAt: data.inspectedAt,
      inspectorName: data.inspectorName,
      location: data.location,
      summary: data.summary,
      status: data.status,
    },
  });
  await audit(prisma, actor, "update_inspection", "Inspection", id, { status: inspection.status });
  return inspection;
}

export async function archiveInspection(actor: Actor, id: string) {
  assertCan(actor, "write_operations");
  await requireInspection(actor, id);
  await prisma.inspection.update({ where: { id }, data: { status: "ARCHIVED" } });
  await audit(prisma, actor, "archive_inspection", "Inspection", id, {});
}

export async function listInspections(actor: Actor, opts: { page?: string; archived?: boolean } = {}) {
  const paging = pageArgs(opts.page);
  const where = {
    organizationId: actor.organizationId,
    ...(opts.archived ? { status: "ARCHIVED" as const } : { status: { not: "ARCHIVED" as const } }),
  };
  const [items, total] = await Promise.all([
    prisma.inspection.findMany({
      where,
      orderBy: { inspectedAt: "desc" },
      skip: paging.skip,
      take: paging.take,
      include: { project: { select: { name: true } }, _count: { select: { findings: true } } },
    }),
    prisma.inspection.count({ where }),
  ]);
  return { items, total, page: paging.page, pageSize: paging.pageSize };
}

export async function getInspection(actor: Actor, id: string) {
  const inspection = await prisma.inspection.findFirst({
    where: { id, organizationId: actor.organizationId },
    include: {
      project: { select: { id: true, name: true } },
      findings: { orderBy: { createdAt: "asc" }, include: { correctiveActions: { orderBy: { createdAt: "asc" } } } },
    },
  });
  if (!inspection) throw new AppError("not_found");
  return inspection;
}

export async function saveChecklist(
  actor: Actor,
  inspectionId: string,
  answers: { key: string; result: string; note: string }[],
) {
  assertCan(actor, "write_operations");
  const inspection = await requireInspection(actor, inspectionId);
  const allowed = new Set(promptsFor(inspection.category).map((prompt) => prompt.key));
  const checklist = answers
    .filter((answer) => allowed.has(answer.key))
    .map((answer) => ({
      key: answer.key,
      result: ["YES", "NO", "NA", "UNANSWERED"].includes(answer.result) ? answer.result : "UNANSWERED",
      note: answer.note.slice(0, 500),
    }));
  await prisma.inspection.update({ where: { id: inspectionId }, data: { checklist } });
  await audit(prisma, actor, "save_checklist", "Inspection", inspectionId, { count: checklist.length });
}

export async function addFinding(actor: Actor, inspectionId: string, input: unknown) {
  assertCan(actor, "write_operations");
  await requireInspection(actor, inspectionId);
  const data = parseInput(findingSchema, input);
  const finding = await prisma.finding.create({
    data: {
      organizationId: actor.organizationId,
      inspectionId,
      description: data.description,
      severity: data.severity,
      immediateAction: data.immediateAction,
    },
  });
  await audit(prisma, actor, "add_finding", "Finding", finding.id, { severity: finding.severity });
  return finding;
}

export async function setFindingStatus(actor: Actor, findingId: string, status: "OPEN" | "CORRECTED") {
  assertCan(actor, "write_operations");
  const finding = await prisma.finding.findFirst({
    where: { id: findingId, organizationId: actor.organizationId },
  });
  if (!finding) throw new AppError("not_found");
  if (status === "CORRECTED") {
    const actions = await prisma.correctiveAction.findMany({
      where: { findingId, status: "COMPLETE" },
    });
    const evidenced = actions.some((action) => (action.evidenceNote ?? "").trim().length >= 10);
    if (!evidenced) throw new AppError("open_actions");
  }
  await prisma.finding.update({ where: { id: findingId }, data: { status } });
  await audit(prisma, actor, "set_finding_status", "Finding", findingId, { status });
}

async function writeCorrective(actor: Actor, findingId: string, data: CorrectiveInput, existingId?: string) {
  if (data.status === "COMPLETE" && (data.evidenceNote ?? "").trim().length < 10) {
    throw new AppError("evidence_required");
  }
  const payload = {
    description: data.description,
    responsibleName: data.responsibleName,
    dueDate: data.dueDate,
    evidenceNote: data.evidenceNote,
    status: data.status,
    completedAt: data.status === "COMPLETE" ? new Date() : null,
  };
  if (!existingId) {
    const created = await prisma.correctiveAction.create({
      data: { organizationId: actor.organizationId, findingId, ...payload },
    });
    const finding = await prisma.finding.findUnique({ where: { id: findingId }, include: { inspection: true } });
    await createUserTask(actor, {
      title: data.description,
      projectId: finding?.inspection.projectId,
      dueAt: data.dueDate,
      correctiveActionId: created.id,
    });
    await audit(prisma, actor, "add_corrective_action", "CorrectiveAction", created.id, { status: created.status });
    return created;
  }
  const existing = await prisma.correctiveAction.findFirst({
    where: { id: existingId, organizationId: actor.organizationId, findingId },
  });
  if (!existing) throw new AppError("not_found");
  const updated = await prisma.correctiveAction.update({ where: { id: existingId }, data: payload });
  if (data.status === "COMPLETE") {
    await prisma.complianceTask.updateMany({
      where: { correctiveActionId: existingId, organizationId: actor.organizationId, status: "OPEN" },
      data: { status: "DONE" },
    });
  }
  await audit(prisma, actor, "update_corrective_action", "CorrectiveAction", existingId, { status: updated.status });
  return updated;
}

export async function addCorrectiveAction(actor: Actor, findingId: string, input: unknown) {
  assertCan(actor, "write_operations");
  const finding = await prisma.finding.findFirst({ where: { id: findingId, organizationId: actor.organizationId } });
  if (!finding) throw new AppError("not_found");
  const data = parseInput(correctiveActionSchema, input);
  return writeCorrective(actor, findingId, data);
}

export async function updateCorrectiveAction(actor: Actor, findingId: string, actionId: string, input: unknown) {
  assertCan(actor, "write_operations");
  const data = parseInput(correctiveActionSchema, input);
  return writeCorrective(actor, findingId, data, actionId);
}

export async function createIncident(actor: Actor, input: unknown) {
  assertCan(actor, "report_incident");
  const data = parseInput(incidentSchema, input);
  if (data.projectId) await requireProject(actor, data.projectId);
  if (actor.role === "WORKER" && data.status === "CLOSED") throw new AppError("forbidden");
  const investigationNotes = actor.role === "WORKER" ? null : data.investigationNotes;
  if (data.status === "CLOSED" && (investigationNotes ?? "").trim().length < 10) {
    throw new AppError("evidence_required");
  }
  const incident = await prisma.incidentReport.create({
    data: {
      organizationId: actor.organizationId,
      createdById: actor.userId,
      projectId: data.projectId,
      type: data.type,
      severity: data.severity,
      occurredAt: data.occurredAt,
      location: data.location,
      description: data.description,
      immediateActions: data.immediateActions,
      peopleInvolved: data.peopleInvolved,
      investigationNotes,
      status: data.status,
    },
  });
  await audit(prisma, actor, "create_incident", "IncidentReport", incident.id, { type: incident.type, severity: incident.severity });
  return incident;
}

export async function updateIncident(actor: Actor, id: string, input: unknown) {
  assertCan(actor, "report_incident");
  const existing = await prisma.incidentReport.findFirst({
    where: {
      id,
      organizationId: actor.organizationId,
      ...(actor.role === "WORKER" ? { createdById: actor.userId } : {}),
    },
  });
  if (!existing) throw new AppError("not_found");
  const data = parseInput(incidentSchema, input);
  if (data.projectId) await requireProject(actor, data.projectId);
  if (actor.role === "WORKER" && data.status === "CLOSED") throw new AppError("forbidden");
  const investigationNotes = actor.role === "WORKER" ? existing.investigationNotes : data.investigationNotes;
  if (data.status === "CLOSED" && (investigationNotes ?? "").trim().length < 10) {
    throw new AppError("evidence_required");
  }
  const incident = await prisma.incidentReport.update({
    where: { id },
    data: {
      projectId: data.projectId,
      type: data.type,
      severity: data.severity,
      occurredAt: data.occurredAt,
      location: data.location,
      description: data.description,
      immediateActions: data.immediateActions,
      peopleInvolved: data.peopleInvolved,
      investigationNotes,
      status: data.status,
    },
  });
  await audit(prisma, actor, "update_incident", "IncidentReport", id, { status: incident.status });
  return incident;
}

export async function listIncidents(actor: Actor, opts: { page?: string } = {}) {
  const paging = pageArgs(opts.page);
  const where = {
    organizationId: actor.organizationId,
    status: { not: "ARCHIVED" as const },
    ...(actor.role === "WORKER" ? { createdById: actor.userId } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.incidentReport.findMany({
      where,
      orderBy: { occurredAt: "desc" },
      skip: paging.skip,
      take: paging.take,
      select: {
        id: true,
        type: true,
        severity: true,
        occurredAt: true,
        status: true,
        location: true,
        project: { select: { name: true } },
      },
    }),
    prisma.incidentReport.count({ where }),
  ]);
  return { items, total, page: paging.page, pageSize: paging.pageSize };
}

export async function getIncident(actor: Actor, id: string) {
  const incident = await prisma.incidentReport.findFirst({
    where: {
      id,
      organizationId: actor.organizationId,
      ...(actor.role === "WORKER" ? { createdById: actor.userId } : {}),
    },
    include: { project: { select: { id: true, name: true } } },
  });
  if (!incident) throw new AppError("not_found");
  if (actor.role !== "WORKER") {
    await audit(prisma, actor, "view_incident", "IncidentReport", id, {
      investigationNotesIncluded: Boolean(incident.investigationNotes),
    });
  }
  if (actor.role === "WORKER") {
    return { ...incident, investigationNotes: null };
  }
  return incident;
}

export async function createDocument(
  actor: Actor,
  input: unknown,
  file?: { name: string; mimeType: string; bytes: Buffer } | null,
) {
  assertCan(actor, "write_operations");
  const data = parseInput(documentSchema, input);
  if (data.projectId) await requireProject(actor, data.projectId);
  let stored: { fileName: string; mimeType: string; byteSize: number; sha256: string; blob: Awaited<ReturnType<ReturnType<typeof getBlobStore>["put"]>> } | null = null;
  if (file && file.bytes.byteLength > 0) {
    assertAllowedFile(file.mimeType, file.bytes.byteLength);
    stored = {
      fileName: safeFileName(file.name, file.mimeType),
      mimeType: file.mimeType,
      byteSize: file.bytes.byteLength,
      sha256: sha256(file.bytes),
      blob: await getBlobStore().put({ organizationId: actor.organizationId, bytes: file.bytes, fileName: file.name }),
    };
  }
  const document = await prisma.safetyDocument.create({
    data: {
      organizationId: actor.organizationId,
      createdById: actor.userId,
      projectId: data.projectId,
      title: data.title,
      category: data.category,
      description: data.description,
      fileName: stored?.fileName,
      mimeType: stored?.mimeType,
      byteSize: stored?.byteSize,
      sha256: stored?.sha256,
      contentBytes: stored?.blob.bytes ? new Uint8Array(stored.blob.bytes) : undefined,
      storageProvider: stored?.blob.provider ?? "DATABASE",
      objectKey: stored?.blob.objectKey,
    },
  });
  await audit(prisma, actor, "create_document", "SafetyDocument", document.id, { category: document.category, hasFile: Boolean(stored) });
  return document;
}

export async function archiveDocument(actor: Actor, id: string) {
  assertCan(actor, "write_operations");
  const existing = await prisma.safetyDocument.findFirst({ where: { id, organizationId: actor.organizationId } });
  if (!existing) throw new AppError("not_found");
  await prisma.safetyDocument.update({ where: { id }, data: { archived: true } });
  await audit(prisma, actor, "archive_document", "SafetyDocument", id, {});
}

export async function listDocuments(actor: Actor, opts: { page?: string; archived?: boolean } = {}) {
  const paging = pageArgs(opts.page);
  const where = {
    organizationId: actor.organizationId,
    archived: Boolean(opts.archived),
  };
  const [items, total] = await Promise.all([
    prisma.safetyDocument.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: paging.skip,
      take: paging.take,
      select: {
        id: true,
        title: true,
        category: true,
        description: true,
        fileName: true,
        mimeType: true,
        byteSize: true,
        createdAt: true,
        project: { select: { name: true } },
      },
    }),
    prisma.safetyDocument.count({ where }),
  ]);
  return { items, total, page: paging.page, pageSize: paging.pageSize };
}

export async function getDocument(actor: Actor, id: string) {
  const document = await prisma.safetyDocument.findFirst({
    where: { id, organizationId: actor.organizationId },
    select: {
      id: true,
      title: true,
      category: true,
      description: true,
      fileName: true,
      mimeType: true,
      byteSize: true,
      sha256: true,
      archived: true,
      createdAt: true,
      project: { select: { id: true, name: true } },
    },
  });
  if (!document) throw new AppError("not_found");
  return document;
}

export async function readDocumentFile(actor: Actor, id: string) {
  const document = await prisma.safetyDocument.findFirst({
    where: { id, organizationId: actor.organizationId, archived: false },
  });
  if (!document?.mimeType || !document.fileName) throw new AppError("not_found");
  const bytes = await readStoredBlob(document);
  if (!bytes) throw new AppError("not_found");
  await audit(prisma, actor, "download_document", "SafetyDocument", id, {});
  return { ...document, contentBytes: bytes };
}

export async function getDashboard(actor: Actor) {
  const organizationId = actor.organizationId;
  const worker = actor.role === "WORKER";
  const [activeProjects, unconfirmed, openActions, imminent, openIncidents, openTasks, meetings, trainings] = await Promise.all([
    prisma.project.count({ where: { organizationId, status: "ACTIVE" } }),
    prisma.project.count({ where: { organizationId, jurisdictionConfirmed: false, status: { not: "ARCHIVED" } } }),
    prisma.correctiveAction.count({ where: { organizationId, status: "OPEN" } }),
    prisma.finding.count({ where: { organizationId, severity: "IMMINENT_DANGER", status: "OPEN" } }),
    prisma.incidentReport.count({
      where: { organizationId, status: { in: ["OPEN", "UNDER_REVIEW"] }, ...(worker ? { createdById: actor.userId } : {}) },
    }),
    prisma.complianceTask.count({ where: { organizationId, status: "OPEN" } }),
    prisma.safetyMeeting.findMany({
      where: { organizationId, status: { not: "ARCHIVED" } },
      orderBy: { scheduledAt: "desc" },
      take: 5,
      include: { project: { select: { name: true } } },
    }),
    prisma.trainingRecord.findMany({
      where: { organizationId, status: "RECORDED", ...(worker ? { employee: { email: actor.email } } : {}) },
      orderBy: { completedOn: "desc" },
      take: 5,
      include: { employee: { select: { firstName: true, lastName: true } } },
    }),
  ]);
  return { activeProjects, unconfirmed, openActions, imminent, openIncidents, openTasks, meetings, trainings };
}

export async function listOpenTasks(actor: Actor) {
  return prisma.complianceTask.findMany({
    where: { organizationId: actor.organizationId, status: "OPEN" },
    orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
    take: 20,
    include: { project: { select: { name: true } } },
  });
}

export type ChecklistJson = Prisma.JsonValue;
