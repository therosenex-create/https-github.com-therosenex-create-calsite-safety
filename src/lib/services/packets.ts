import type { Actor } from "../actor";
import { assertCan } from "../authz";
import { prisma } from "../db";
import { AppError } from "../errors";
import { packetItemSchema, packetSchema, parseInput } from "../validation";
import { audit } from "./common";

export const PACKET_KINDS = ["MEETING", "INSPECTION", "INCIDENT", "PERMIT", "DOCUMENT", "PUBLIC_WORKS"] as const;
export type PacketKind = (typeof PACKET_KINDS)[number];

async function labelFor(actor: Actor, kind: PacketKind, recordId: string, projectId: string | null) {
  const organizationId = actor.organizationId;
  const project = projectId ? { projectId } : {};
  if (kind === "MEETING") {
    const row = await prisma.safetyMeeting.findFirst({ where: { id: recordId, organizationId, ...project }, select: { title: true } });
    if (!row) throw new AppError("not_found");
    return row.title;
  }
  if (kind === "INSPECTION") {
    const row = await prisma.inspection.findFirst({ where: { id: recordId, organizationId, ...project }, select: { category: true } });
    if (!row) throw new AppError("not_found");
    return row.category;
  }
  if (kind === "INCIDENT") {
    const row = await prisma.incidentReport.findFirst({
      where: {
        id: recordId,
        organizationId,
        ...project,
        ...(actor.role === "WORKER" ? { createdById: actor.userId } : {}),
      },
      select: { type: true },
    });
    if (!row) throw new AppError("not_found");
    return row.type;
  }
  if (kind === "PERMIT") {
    const row = await prisma.permitRecord.findFirst({ where: { id: recordId, organizationId, ...project }, select: { permitType: true } });
    if (!row) throw new AppError("not_found");
    return row.permitType;
  }
  if (kind === "DOCUMENT") {
    const row = await prisma.safetyDocument.findFirst({ where: { id: recordId, organizationId, ...project }, select: { title: true } });
    if (!row) throw new AppError("not_found");
    return row.title;
  }
  const row = await prisma.publicWorksRecord.findFirst({ where: { id: recordId, organizationId, ...project }, select: { awardingBody: true } });
  if (!row) throw new AppError("not_found");
  return row.awardingBody;
}

export async function createPacket(actor: Actor, input: unknown) {
  assertCan(actor, "write_operations");
  const data = parseInput(packetSchema, input);
  if (data.projectId) {
    const project = await prisma.project.findFirst({ where: { id: data.projectId, organizationId: actor.organizationId } });
    if (!project) throw new AppError("not_found");
  }
  const packet = await prisma.evidencePacket.create({
    data: {
      organizationId: actor.organizationId,
      projectId: data.projectId,
      title: data.title,
      purposeNote: data.purposeNote,
      createdById: actor.userId,
    },
  });
  await audit(prisma, actor, "create_packet", "EvidencePacket", packet.id, {});
  return packet;
}

export async function addPacketItem(actor: Actor, input: unknown) {
  assertCan(actor, "write_operations");
  const data = parseInput(packetItemSchema, input);
  const packet = await prisma.evidencePacket.findFirst({
    where: { id: data.packetId, organizationId: actor.organizationId },
  });
  if (!packet) throw new AppError("not_found");
  const label = await labelFor(actor, data.kind, data.recordId, packet.projectId);
  const last = await prisma.evidencePacketItem.findFirst({
    where: { packetId: packet.id },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  const item = await prisma.evidencePacketItem.create({
    data: {
      organizationId: actor.organizationId,
      packetId: packet.id,
      kind: data.kind,
      recordId: data.recordId,
      sortOrder: (last?.sortOrder ?? 0) + 1,
      label,
    },
  });
  await audit(prisma, actor, "add_packet_item", "EvidencePacketItem", item.id, { kind: item.kind });
  return item;
}

export async function listPackets(actor: Actor) {
  return prisma.evidencePacket.findMany({
    where: { organizationId: actor.organizationId },
    orderBy: { createdAt: "desc" },
    include: { project: { select: { name: true } }, _count: { select: { items: true } } },
    take: 100,
  });
}

async function resolveItem(actor: Actor, kind: string, recordId: string) {
  const organizationId = actor.organizationId;
  if (kind === "MEETING") {
    const row = await prisma.safetyMeeting.findFirst({
      where: { id: recordId, organizationId },
      include: { attendance: { include: { employee: { select: { firstName: true, lastName: true } } } }, project: { select: { name: true } } },
    });
    if (!row) return null;
    return { title: row.title, detail: `${row.project?.name ?? ""} · ${row.attendance.map((line) => `${line.employee.firstName} ${line.employee.lastName}`).join(", ")}` };
  }
  if (kind === "INSPECTION") {
    const row = await prisma.inspection.findFirst({
      where: { id: recordId, organizationId },
      include: { findings: { include: { correctiveActions: true } } },
    });
    if (!row) return null;
    return { title: row.category, detail: row.summary };
  }
  if (kind === "INCIDENT") {
    const row = await prisma.incidentReport.findFirst({ where: { id: recordId, organizationId } });
    if (!row) return null;
    if (actor.role === "WORKER" && row.createdById !== actor.userId) return { withheld: true as const };
    return { title: row.type, detail: row.description };
  }
  if (kind === "PERMIT") {
    const row = await prisma.permitRecord.findFirst({ where: { id: recordId, organizationId } });
    if (!row) return null;
    return { title: row.permitType, detail: `${row.status} · ${row.authorityName}` };
  }
  if (kind === "DOCUMENT") {
    const row = await prisma.safetyDocument.findFirst({ where: { id: recordId, organizationId } });
    if (!row) return null;
    return { title: row.title, detail: row.fileName ?? row.category };
  }
  const row = await prisma.publicWorksRecord.findFirst({ where: { id: recordId, organizationId } });
  if (!row) return null;
  return { title: row.awardingBody, detail: row.registrationEvidenceNote };
}

export async function getPacketExport(actor: Actor, id: string) {
  const packet = await prisma.evidencePacket.findFirst({
    where: { id, organizationId: actor.organizationId },
    include: { items: { orderBy: { sortOrder: "asc" } }, project: { select: { name: true } } },
  });
  if (!packet) throw new AppError("not_found");
  const included = [];
  for (const item of packet.items) {
    const resolved = await resolveItem(actor, item.kind, item.recordId);
    if (!resolved) {
      included.push({ kind: item.kind, recordId: item.recordId, label: item.label, state: "missing" as const, detail: null });
    } else if ("withheld" in resolved) {
      included.push({ kind: item.kind, recordId: item.recordId, label: item.label, state: "withheld" as const, detail: null });
    } else {
      included.push({ kind: item.kind, recordId: item.recordId, label: resolved.title, state: "included" as const, detail: resolved.detail });
    }
  }
  const present = new Set(included.filter((item) => item.state === "included").map((item) => item.kind));
  return {
    packet,
    included,
    missingKinds: PACKET_KINDS.filter((kind) => !present.has(kind)),
  };
}

export async function listPacketChoices(actor: Actor, projectId: string | null) {
  const organizationId = actor.organizationId;
  const project = projectId ? { projectId } : {};
  const [meetings, inspections, incidents, permits, documents, works] = await Promise.all([
    prisma.safetyMeeting.findMany({ where: { organizationId, ...project }, select: { id: true, title: true }, take: 100 }),
    prisma.inspection.findMany({ where: { organizationId, ...project }, select: { id: true, category: true }, take: 100 }),
    prisma.incidentReport.findMany({
      where: { organizationId, ...project, ...(actor.role === "WORKER" ? { createdById: actor.userId } : {}) },
      select: { id: true, type: true },
      take: 100,
    }),
    prisma.permitRecord.findMany({ where: { organizationId, ...project }, select: { id: true, permitType: true }, take: 100 }),
    prisma.safetyDocument.findMany({ where: { organizationId, ...project, archived: false }, select: { id: true, title: true }, take: 100 }),
    prisma.publicWorksRecord.findMany({ where: { organizationId, ...project }, select: { id: true, awardingBody: true }, take: 100 }),
  ]);
  return { meetings, inspections, incidents, permits, documents, works };
}
