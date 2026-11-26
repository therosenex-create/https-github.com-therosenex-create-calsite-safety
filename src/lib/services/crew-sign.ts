import { randomBytes, randomUUID } from "crypto";
import { hash, compare } from "bcryptjs";
import { Prisma, type SignableType } from "@prisma/client";
import type { Actor } from "../actor";
import { assertCan } from "../authz";
import { prisma } from "../db";
import { AppError } from "../errors";
import { sha256 } from "../fingerprint";
import { MAX_FILE_BYTES } from "../files";
import { tailgateTopic } from "../tailgate-topics";
import { pacificLocalToUtc, pacificTodayInput } from "../time";
import { audit, requireMeeting, requireProject } from "./common";
import { verifyChain, computeEventHash, type ChainEvent } from "../sign/chain";
import {
  CONSENT_BODY,
  CONSENT_VERSION,
  FORM_CODE,
  employeeName,
  meetingDate,
  methodLabel,
  ownerAttestation,
  recordDigest,
  sameName,
  signedFileName,
  summarizeUserAgent,
  tailgateAttestation,
} from "../sign/format";
import { decodeSignaturePng, parseStrokes } from "../sign/image";
import { applyOptionalPades } from "../sign/pades";
import { buildSignedPdf } from "../sign/pdf";
import {
  readEnroll,
  readFinish,
  readKioskSign,
  readKioskStart,
  readOwnerSign,
  readRevise,
  readSignRequest,
  readVisitor,
} from "../sign/schemas";

const PIN_ROUNDS = 10;
const PIN_LIMIT = 5;
const PIN_LOCK_MS = 15 * 60 * 1000;
const KIOSK_WINDOW_MS = 15 * 60 * 1000;
const KIOSK_LIMIT = 80;

export type SignContext = {
  ip?: string | null;
  userAgent?: string | null;
  deviceId?: string | null;
};

type Tx = Prisma.TransactionClient;

type NewEvent = Omit<ChainEvent, "eventHash" | "prevEventHash">;

function asBytes(input: Uint8Array) {
  const copy = new Uint8Array(input.byteLength);
  copy.set(input);
  return copy;
}

let dummyPinHash: string | null = null;

function clientIp(ip?: string | null) {
  const clean = (ip || "unknown").split(",")[0]?.trim().replace(/[^\d.a-fA-F:]/g, "").slice(0, 64);
  return clean || "unknown";
}

function deviceId(value?: string | null) {
  if (!value) return null;
  const clean = value.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 80);
  return clean || null;
}

export function newKioskToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: sha256(token) };
}

async function assertRate(tokenHash: string, ip: string) {
  const since = new Date(Date.now() - KIOSK_WINDOW_MS);
  const count = await prisma.kioskAttempt.count({
    where: { tokenHash, ip, attemptedAt: { gte: since } },
  });
  if (count >= KIOSK_LIMIT) throw new AppError("rate_limited");
}

async function recordAttempt(tokenHash: string, ip: string, success: boolean) {
  await prisma.kioskAttempt.create({ data: { tokenHash, ip, success } });
}

async function openKiosk(token: string, ip?: string | null) {
  const tokenHash = sha256(token || "missing");
  const address = clientIp(ip);
  await assertRate(tokenHash, address);
  const link = await prisma.kioskLink.findFirst({
    where: { tokenHash, active: true },
    include: { project: true },
  });
  if (!link) {
    await recordAttempt(tokenHash, address, false);
    throw new AppError("token_invalid");
  }
  return { link, tokenHash, ip: address };
}

async function verifyPin(employeeId: string, pin: string, tokenHash: string, ip: string) {
  if (!/^\d{4,6}$/.test(pin)) {
    await recordAttempt(tokenHash, ip, false);
    throw new AppError("invalid_pin");
  }
  dummyPinHash ??= await hash("000000", PIN_ROUNDS);
  const outcome = await prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<Array<{
      id: string;
      pin_hash: string;
      revoked_at: Date | null;
      locked_until: Date | null;
      failed_attempts: number;
    }>>`
      SELECT id, pin_hash, revoked_at, locked_until, failed_attempts
      FROM signer_credentials
      WHERE employee_id = ${employeeId}
      FOR UPDATE
    `;
    const credential = rows[0];
    if (!credential) {
      await compare(pin, dummyPinHash!);
      return { code: "not_enrolled" as const };
    }
    const locked = Boolean(credential.locked_until && new Date(credential.locked_until).getTime() > Date.now());
    const match = await compare(pin, credential.pin_hash);
    if (credential.revoked_at || locked || !match) {
      if (!credential.revoked_at && !locked) {
        const failedAttempts = credential.failed_attempts + 1;
        await tx.signerCredential.update({
          where: { id: credential.id },
          data: {
            failedAttempts,
            lockedUntil: failedAttempts >= PIN_LIMIT ? new Date(Date.now() + PIN_LOCK_MS) : null,
          },
        });
        return { code: failedAttempts >= PIN_LIMIT ? ("pin_locked" as const) : ("pin_invalid" as const) };
      }
      return { code: credential.revoked_at ? ("pin_revoked" as const) : ("pin_locked" as const) };
    }
    if (credential.failed_attempts || credential.locked_until) {
      await tx.signerCredential.update({
        where: { id: credential.id },
        data: { failedAttempts: 0, lockedUntil: null },
      });
    }
    return { code: "ok" as const, id: credential.id };
  });
  if (outcome.code !== "ok") {
    await recordAttempt(tokenHash, ip, false);
    throw new AppError(outcome.code);
  }
  await recordAttempt(tokenHash, ip, true);
  return prisma.signerCredential.findUniqueOrThrow({ where: { id: outcome.id } });
}

async function appendEvent(tx: Tx, input: NewEvent) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${input.organizationId}))`;
  const links = await tx.signatureEvent.findMany({
    where: { organizationId: input.organizationId },
    select: { eventHash: true, prevEventHash: true },
  });
  const pointed = new Set(links.map((row) => row.prevEventHash).filter((value): value is string => Boolean(value)));
  const tails = links.filter((row) => !pointed.has(row.eventHash));
  if (links.length > 0 && tails.length !== 1) throw new AppError("chain_broken");
  const prevEventHash = tails[0]?.eventHash ?? null;
  const eventHash = computeEventHash({ ...input, prevEventHash });
  return tx.signatureEvent.create({
    data: {
      organizationId: input.organizationId,
      recordType: input.recordType as SignableType,
      recordId: input.recordId,
      recordRevision: input.recordRevision,
      employeeId: input.employeeId,
      userId: input.userId,
      signerName: input.signerName,
      roleLabel: input.roleLabel,
      companyName: input.companyName,
      attestationText: input.attestationText,
      attestationLang: input.attestationLang,
      method: input.method,
      signatureImage: asBytes(input.signatureImage),
      strokes: input.strokes as Prisma.InputJsonValue,
      typedName: input.typedName,
      consentTextId: input.consentTextId,
      ip: input.ip,
      userAgent: input.userAgent,
      deviceId: input.deviceId,
      signedAt: input.signedAt,
      late: input.late,
      flagged: input.flagged,
      recordHash: input.recordHash,
      prevEventHash,
      eventHash,
    },
  });
}

function contextOf(ctx: SignContext) {
  return {
    ip: clientIp(ctx.ip),
    userAgent: summarizeUserAgent(ctx.userAgent),
    deviceId: deviceId(ctx.deviceId),
  };
}

export async function ensureConsentTexts(organizationId: string) {
  const saved = [];
  for (const language of ["en", "es"] as const) {
    const body = CONSENT_BODY[language];
    saved.push(
      await prisma.consentText.upsert({
        where: { organizationId_version_language: { organizationId, version: CONSENT_VERSION, language } },
        update: {},
        create: { organizationId, version: CONSENT_VERSION, language, body, sha256: sha256(body) },
      }),
    );
  }
  return saved;
}

async function storePdf(input: {
  organizationId: string;
  projectId: string | null;
  projectCode: string | null;
  recordType: SignableType;
  recordId: string;
  revision: number;
  recordDate: Date;
  formCode: string;
  recordHash: string;
  title: string;
  lines: string[];
  sections: { heading: string; body: string }[];
  events: ChainEvent[];
  replaceIfUnexported?: boolean;
}) {
  const consentIds = [...new Set(input.events.map((event) => event.consentTextId).filter((id): id is string => Boolean(id)))];
  const consents = consentIds.length
    ? await prisma.consentText.findMany({ where: { id: { in: consentIds } }, select: { id: true, version: true } })
    : [];
  const versions = new Map(consents.map((row) => [row.id, row.version]));
  const footer = `Record ${input.recordId} rev ${input.revision} content sha256 ${input.recordHash}`;
  const raw = await buildSignedPdf({
    title: input.title,
    lines: input.lines,
    sections: input.sections,
    footer,
    signatures: input.events.map((event) => ({
      name: event.signerName,
      role: event.roleLabel,
      companyName: event.companyName,
      png: event.signatureImage,
      signedAt: event.signedAt,
      late: event.late,
      flagged: event.flagged,
      method: event.method,
    })),
    audits: input.events.map((event) => ({
      signerName: event.signerName,
      roleLabel: event.roleLabel,
      method: methodLabel(event.method),
      signedAt: event.signedAt,
      ip: event.ip,
      userAgent: event.userAgent,
      deviceId: event.deviceId,
      consentVersion: event.consentTextId ? versions.get(event.consentTextId) ?? null : null,
      recordHash: event.recordHash,
      eventHash: event.eventHash,
      late: event.late,
    })),
  });
  const sealed = applyOptionalPades(raw);
  const bytes = asBytes(sealed.bytes);
  const digest = sha256(bytes);
  const fileName = signedFileName(input.projectCode, input.formCode, input.recordType, meetingDate(input.recordDate), input.revision);
  const existing = await prisma.signedRecordPdf.findUnique({
    where: {
      organizationId_recordType_recordId_revision: {
        organizationId: input.organizationId,
        recordType: input.recordType,
        recordId: input.recordId,
        revision: input.revision,
      },
    },
  });
  if (existing?.exportedAt) return existing;
  if (existing && input.replaceIfUnexported) {
    return prisma.signedRecordPdf.update({
      where: { id: existing.id },
      data: { bytes, sha256: digest, fileName, completedAt: new Date() },
    });
  }
  if (existing) return existing;
  return prisma.signedRecordPdf.create({
    data: {
      organizationId: input.organizationId,
      projectId: input.projectId,
      recordType: input.recordType,
      recordId: input.recordId,
      revision: input.revision,
      recordDate: input.recordDate,
      fileName,
      bytes,
      sha256: digest,
      completedAt: new Date(),
    },
  });
}

function toChain(row: {
  attestationLang: string;
  attestationText: string;
  companyName: string | null;
  consentTextId: string | null;
  deviceId: string | null;
  employeeId: string | null;
  eventHash: string;
  flagged: boolean;
  ip: string | null;
  late: boolean;
  method: string;
  organizationId: string;
  prevEventHash: string | null;
  recordHash: string;
  recordId: string;
  recordRevision: number;
  recordType: string;
  roleLabel: string;
  signatureImage: Uint8Array;
  signedAt: Date;
  signerName: string;
  strokes: Prisma.JsonValue;
  typedName: string;
  userAgent: string | null;
  userId: string | null;
}): ChainEvent {
  return { ...row, signatureImage: Buffer.from(row.signatureImage), strokes: row.strokes };
}

async function loadOrgChain(organizationId: string) {
  const rows = await prisma.signatureEvent.findMany({ where: { organizationId } });
  return rows.map(toChain);
}

async function activeEvents(organizationId: string, recordType: SignableType, recordId: string, revision: number) {
  const rows = await prisma.signatureEvent.findMany({
    where: { organizationId, recordType, recordId, recordRevision: revision },
    orderBy: { signedAt: "asc" },
  });
  const voids = await prisma.signatureVoid.findMany({
    where: { eventId: { in: rows.map((row) => row.id) } },
    select: { eventId: true },
  });
  const voided = new Set(voids.map((row) => row.eventId));
  return rows.filter((row) => !voided.has(row.id)).map(toChain);
}

function tailgateContent(meeting: {
  projectId: string | null;
  topicCode: string | null;
  topic: string;
  discussionPoints: string | null;
  hazards: string | null;
  language: string;
  signRevision: number;
  scheduledAt: Date;
}, project: { id: string; name: string; code: string | null }) {
  return {
    date: meetingDate(meeting.scheduledAt),
    hazards: meeting.hazards ?? "",
    language: meeting.language,
    points: meeting.discussionPoints ?? "",
    projectCode: project.code,
    projectId: project.id,
    projectName: project.name,
    revision: meeting.signRevision,
    topicCode: meeting.topicCode,
    topicTitle: meeting.topic,
    type: "TAILGATE",
  };
}

async function lockedTailgateContent(tx: Tx, meetingId: string, organizationId: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${meetingId}))`;
  const fresh = await tx.safetyMeeting.findFirst({ where: { id: meetingId, organizationId } });
  if (!fresh?.projectId) throw new AppError("tailgate_required");
  const project = await tx.project.findFirst({
    where: { id: fresh.projectId, organizationId },
    select: { id: true, name: true, code: true },
  });
  if (!project) throw new AppError("not_found");
  const content = tailgateContent(fresh, project);
  return { fresh, recordHash: recordDigest(content), date: content.date };
}

async function currentTailgate(projectId: string) {
  const open = await prisma.safetyMeeting.findFirst({
    where: { projectId, crewSign: true, signLockedAt: null, status: { not: "ARCHIVED" } },
    orderBy: { createdAt: "desc" },
  });
  if (open) return open;
  return prisma.safetyMeeting.findFirst({
    where: { projectId, crewSign: true, status: "COMPLETE", signLockedAt: { not: null } },
    orderBy: { signLockedAt: "desc" },
  });
}

async function crewEmployee(organizationId: string, projectId: string, employeeId: string) {
  const assignment = await prisma.projectAssignment.findFirst({
    where: { organizationId, projectId, employeeId, employee: { status: "ACTIVE" } },
    include: { employee: true },
  });
  if (!assignment) throw new AppError("not_found");
  return assignment.employee;
}

export async function enrollSigner(actor: Actor, input: unknown, ctx: SignContext = {}) {
  assertCan(actor, "write_operations");
  const data = readEnroll(input);
  const employee = await prisma.employee.findFirst({
    where: { id: data.employeeId, organizationId: actor.organizationId, status: "ACTIVE" },
  });
  if (!employee) throw new AppError("not_found");
  const legal = employeeName(employee);
  if (!sameName(data.printedName, legal)) throw new AppError("name_mismatch", "printedName");
  const png = decodeSignaturePng(data.signaturePng);
  const strokes = parseStrokes(data.strokes);
  const consents = await ensureConsentTexts(actor.organizationId);
  const consent = consents.find((row) => row.language === data.language) ?? consents[0];
  const pinHash = await hash(data.pin, PIN_ROUNDS);
  const meta = contextOf(ctx);
  const recordHash = recordDigest({
    consentSha256: consent.sha256,
    consentVersion: consent.version,
    employeeId: employee.id,
    language: consent.language,
    printedName: legal,
    type: "ESIGN_CONSENT",
  });
  const existing = await prisma.signerCredential.findUnique({ where: { employeeId: employee.id } });
  if (existing && !existing.revokedAt) throw new AppError("already_enrolled");
  const priorConsents = existing
    ? await prisma.signatureEvent.count({
        where: { organizationId: actor.organizationId, recordType: "ESIGN_CONSENT", recordId: existing.id },
      })
    : 0;
  const consentRevision = priorConsents + 1;
  const signedAt = new Date();
  const event = await prisma.$transaction(async (tx) => {
    const credential = existing
      ? await tx.signerCredential.update({
          where: { id: existing.id },
          data: {
            pinHash,
            consentTextId: consent.id,
            consentEventId: null,
            enrolledByUserId: actor.userId,
            enrolledAt: signedAt,
            failedAttempts: 0,
            lockedUntil: null,
            revokedAt: null,
            revokedByUserId: null,
          },
        })
      : await tx.signerCredential.create({
          data: {
            organizationId: actor.organizationId,
            employeeId: employee.id,
            pinHash,
            consentTextId: consent.id,
            enrolledByUserId: actor.userId,
            enrolledAt: signedAt,
          },
        });
    const created = await appendEvent(tx, {
      organizationId: actor.organizationId,
      recordType: "ESIGN_CONSENT",
      recordId: credential.id,
      recordRevision: consentRevision,
      employeeId: employee.id,
      userId: null,
      signerName: legal,
      roleLabel: "worker",
      companyName: employee.companyName,
      attestationText: consent.body,
      attestationLang: consent.language,
      method: "pin+drawn",
      signatureImage: png,
      strokes,
      typedName: legal,
      consentTextId: consent.id,
      ip: meta.ip,
      userAgent: meta.userAgent,
      deviceId: meta.deviceId,
      signedAt,
      late: false,
      flagged: false,
      recordHash,
    });
    await tx.signerCredential.update({ where: { id: credential.id }, data: { consentEventId: created.id } });
    return created;
  });
  const witness = `Witnessed in person by ${actor.name} (${actor.email}) at ${signedAt.toISOString()}.`;
  const chainEvent = toChain(event);
  const pdf = await storePdf({
    organizationId: actor.organizationId,
    projectId: null,
    projectCode: null,
    recordType: "ESIGN_CONSENT",
    recordId: event.recordId,
    revision: consentRevision,
    recordDate: signedAt,
    formCode: FORM_CODE.ESIGN_CONSENT,
    recordHash,
    title: "Electronic signature consent",
    lines: [legal, `Consent version ${consent.version}`, witness],
    sections: [{ heading: "Consent", body: consent.body }],
    events: [chainEvent],
  });
  await audit(prisma, actor, "witness_enrollment", "SignerCredential", event.recordId, {
    witness: actor.name,
    eventId: event.id,
    consentVersion: consent.version,
  });
  return { credentialId: event.recordId, eventId: event.id, pdfId: pdf.id };
}

export async function revokeSigner(actor: Actor, employeeId: string) {
  assertCan(actor, "manage_members");
  const credential = await prisma.signerCredential.findFirst({
    where: { employeeId, organizationId: actor.organizationId, revokedAt: null },
  });
  if (!credential) throw new AppError("not_found");
  await prisma.signerCredential.update({
    where: { id: credential.id },
    data: { revokedAt: new Date(), revokedByUserId: actor.userId },
  });
  await audit(prisma, actor, "revoke_signer", "SignerCredential", credential.id, {});
}

export async function rotateKiosk(actor: Actor, projectId: string) {
  assertCan(actor, "write_operations");
  const project = await requireProject(actor, projectId);
  const issued = newKioskToken();
  await prisma.$transaction(async (tx) => {
    await tx.kioskLink.updateMany({
      where: { organizationId: actor.organizationId, projectId, active: true },
      data: { active: false, rotatedAt: new Date() },
    });
    await tx.kioskLink.create({
      data: {
        organizationId: actor.organizationId,
        projectId,
        tokenHash: issued.tokenHash,
        createdByUserId: actor.userId,
        active: true,
      },
    });
  });
  await audit(prisma, actor, "rotate_kiosk", "Project", projectId, {});
  return { token: issued.token, project };
}

export async function disableKiosk(actor: Actor, projectId: string) {
  assertCan(actor, "write_operations");
  await requireProject(actor, projectId);
  await prisma.kioskLink.updateMany({
    where: { organizationId: actor.organizationId, projectId, active: true },
    data: { active: false, rotatedAt: new Date() },
  });
  await audit(prisma, actor, "disable_kiosk", "Project", projectId, {});
}

export async function kioskStatus(actor: Actor, projectId: string) {
  await requireProject(actor, projectId);
  return prisma.kioskLink.findFirst({
    where: { organizationId: actor.organizationId, projectId, active: true },
    select: { id: true, createdAt: true, active: true },
  });
}

export async function issuedKioskMatches(actor: Actor, projectId: string, token: string) {
  if (!token) return false;
  const row = await prisma.kioskLink.findFirst({
    where: { organizationId: actor.organizationId, projectId, tokenHash: sha256(token), active: true },
    select: { id: true },
  });
  return Boolean(row);
}

export async function getKioskView(token: string) {
  const tokenHash = sha256(token || "missing");
  const link = await prisma.kioskLink.findFirst({
    where: { tokenHash, active: true },
    include: { project: true },
  });
  if (!link) throw new AppError("token_invalid");
  const roster = await prisma.projectAssignment.findMany({
    where: { projectId: link.projectId, organizationId: link.organizationId, employee: { status: "ACTIVE" } },
    include: {
      employee: {
        select: { id: true, firstName: true, lastName: true, jobTitle: true, preferredLanguage: true, companyName: true, workerType: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });
  roster.sort((a, b) => employeeName(a.employee).localeCompare(employeeName(b.employee)));
  const meeting = await currentTailgate(link.projectId);
  const signatures = meeting ? await activeEvents(link.organizationId, "TAILGATE", meeting.id, meeting.signRevision) : [];
  return { project: link.project, roster: roster.map((row) => row.employee), meeting, signatures };
}

export async function kioskStartTailgate(token: string, input: unknown, ctx: SignContext = {}) {
  const data = readKioskStart(input);
  const opened = await openKiosk(token, ctx.ip);
  const employee = await crewEmployee(opened.link.organizationId, opened.link.projectId, data.employeeId);
  await verifyPin(employee.id, data.pin, opened.tokenHash, opened.ip);
  const topic = tailgateTopic(data.topicCode);
  if (!topic) throw new AppError("invalid", "topicCode");
  const date = pacificTodayInput();
  const title = data.language === "es" ? topic.titleEs : topic.titleEn;
  try {
    return await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${opened.link.projectId}))`;
      const existing = await tx.safetyMeeting.findFirst({
        where: { projectId: opened.link.projectId, crewSign: true, signLockedAt: null, status: { not: "ARCHIVED" } },
      });
      if (existing) throw new AppError("tailgate_open");
      return tx.safetyMeeting.create({
        data: {
          organizationId: opened.link.organizationId,
          projectId: opened.link.projectId,
          createdById: opened.link.createdByUserId,
          title,
          topic: title,
          topicCode: topic.code,
          language: data.language,
          scheduledAt: pacificLocalToUtc(`${date}T07:00`),
          leaderName: employeeName(employee),
          conductorEmployeeId: employee.id,
          policyBasis: "COMPANY_POLICY",
          requirementCode: topic.citation,
          discussionPoints: data.points,
          hazards: data.hazards,
          status: "SCHEDULED",
          meetingKind: "TAILGATE",
          crewSign: true,
          signRevision: 1,
        },
      });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new AppError("tailgate_open");
    throw error;
  }
}

export async function kioskSign(token: string, input: unknown, ctx: SignContext = {}) {
  const data = readKioskSign(input);
  const opened = await openKiosk(token, ctx.ip);
  const employee = await crewEmployee(opened.link.organizationId, opened.link.projectId, data.employeeId);
  const legal = employeeName(employee);
  if (data.signerName && !sameName(data.signerName, legal)) throw new AppError("not_your_signature");
  if (data.typedName && !sameName(data.typedName, legal)) throw new AppError("not_your_signature");
  const meeting = await currentTailgate(opened.link.projectId);
  if (!meeting) throw new AppError("tailgate_required");
  await verifyPin(employee.id, data.pin, opened.tokenHash, opened.ip);
  const png = decodeSignaturePng(data.signaturePng);
  const strokes = parseStrokes(data.strokes);
  const credential = await prisma.signerCredential.findUniqueOrThrow({ where: { employeeId: employee.id } });
  const meta = contextOf(ctx);
  const content = tailgateContent(meeting, opened.link.project);
  const recordHash = recordDigest(content);
  let saved: Awaited<ReturnType<typeof appendEvent>>;
  try {
    saved = await prisma.$transaction(async (tx) => {
      const current = await lockedTailgateContent(tx, meeting.id, opened.link.organizationId);
      if (current.recordHash !== recordHash) throw new AppError("content_changed");
      const fresh = current.fresh;
      const prior = await tx.signatureEvent.findFirst({
        where: {
          organizationId: opened.link.organizationId,
          recordType: "TAILGATE",
          recordId: fresh.id,
          recordRevision: fresh.signRevision,
          employeeId: employee.id,
        },
        select: { id: true },
      });
      if (prior) throw new AppError("already_signed");
      return appendEvent(tx, {
        organizationId: opened.link.organizationId,
        recordType: "TAILGATE",
        recordId: fresh.id,
        recordRevision: fresh.signRevision,
        employeeId: employee.id,
        userId: null,
        signerName: legal,
        roleLabel: fresh.conductorEmployeeId === employee.id ? "foreman" : "attendee",
        companyName: employee.companyName,
        attestationText: tailgateAttestation(fresh.language, current.date),
        attestationLang: fresh.language,
        method: "pin+drawn",
        signatureImage: png,
        strokes,
        typedName: legal,
        consentTextId: credential.consentTextId,
        ip: meta.ip,
        userAgent: meta.userAgent,
        deviceId: meta.deviceId,
        signedAt: new Date(),
        late: Boolean(fresh.signLockedAt),
        flagged: false,
        recordHash: current.recordHash,
      });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new AppError("already_signed");
    throw error;
  }
  if (saved.late) await rebuildTailgatePdf(meeting.id);
  return saved;
}

export async function kioskSignVisitor(token: string, input: unknown, ctx: SignContext = {}) {
  const data = readVisitor(input);
  const opened = await openKiosk(token, ctx.ip);
  if (!sameName(data.typedName, data.visitorName)) throw new AppError("not_your_signature");
  const meeting = await currentTailgate(opened.link.projectId);
  if (!meeting) throw new AppError("tailgate_required");
  const png = decodeSignaturePng(data.signaturePng);
  const strokes = parseStrokes(data.strokes);
  const content = tailgateContent(meeting, opened.link.project);
  const recordHash = recordDigest(content);
  const meta = contextOf(ctx);
  const saved = await prisma.$transaction(async (tx) => {
    const current = await lockedTailgateContent(tx, meeting.id, opened.link.organizationId);
    if (current.recordHash !== recordHash) throw new AppError("content_changed");
    const fresh = current.fresh;
    return appendEvent(tx, {
      organizationId: opened.link.organizationId,
      recordType: "TAILGATE",
      recordId: fresh.id,
      recordRevision: fresh.signRevision,
      employeeId: null,
      userId: null,
      signerName: data.visitorName.trim(),
      roleLabel: "visitor",
      companyName: data.companyName.trim(),
      attestationText: tailgateAttestation(fresh.language, current.date),
      attestationLang: fresh.language,
      method: "drawn_unenrolled",
      signatureImage: png,
      strokes,
      typedName: data.visitorName.trim(),
      consentTextId: null,
      ip: meta.ip,
      userAgent: meta.userAgent,
      deviceId: meta.deviceId,
      signedAt: new Date(),
      late: Boolean(fresh.signLockedAt),
      flagged: true,
      recordHash: current.recordHash,
    });
  });
  if (saved.late) await rebuildTailgatePdf(meeting.id);
  return saved;
}

export async function kioskFinish(token: string, input: unknown, ctx: SignContext = {}) {
  const data = readFinish(input);
  const opened = await openKiosk(token, ctx.ip);
  const meeting = await prisma.safetyMeeting.findFirst({
    where: { projectId: opened.link.projectId, crewSign: true, signLockedAt: null, status: { not: "ARCHIVED" } },
    orderBy: { createdAt: "desc" },
  });
  if (!meeting || !meeting.conductorEmployeeId) throw new AppError("tailgate_required");
  if (data.employeeId !== meeting.conductorEmployeeId) throw new AppError("foreman_required");
  await verifyPin(meeting.conductorEmployeeId, data.pin, opened.tokenHash, opened.ip);
  const locked = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${meeting.id}))`;
    const fresh = await tx.safetyMeeting.findFirst({
      where: { id: meeting.id, organizationId: opened.link.organizationId, signLockedAt: null, status: { not: "ARCHIVED" } },
    });
    if (!fresh?.conductorEmployeeId) throw new AppError("tailgate_required");
    const foremanEvent = await tx.signatureEvent.findFirst({
      where: {
        organizationId: opened.link.organizationId,
        recordType: "TAILGATE",
        recordId: fresh.id,
        recordRevision: fresh.signRevision,
        employeeId: fresh.conductorEmployeeId,
        roleLabel: "foreman",
      },
      select: { id: true },
    });
    if (!foremanEvent) throw new AppError("foreman_required");
    return tx.safetyMeeting.update({
      where: { id: fresh.id },
      data: { signLockedAt: new Date(), status: "COMPLETE" },
    });
  });
  const pdf = await rebuildTailgatePdf(locked.id);
  return { meeting: locked, pdfId: pdf?.id ?? null };
}

async function rebuildTailgatePdf(meetingId: string) {
  const meeting = await prisma.safetyMeeting.findUniqueOrThrow({
    where: { id: meetingId },
    include: { project: true },
  });
  if (!meeting.project) throw new AppError("not_found");
  const events = await activeEvents(meeting.organizationId, "TAILGATE", meeting.id, meeting.signRevision);
  const content = tailgateContent(meeting, meeting.project);
  const recordHash = recordDigest(content);
  return storePdf({
    organizationId: meeting.organizationId,
    projectId: meeting.projectId,
    projectCode: meeting.project.code,
    recordType: "TAILGATE",
    recordId: meeting.id,
    revision: meeting.signRevision,
    recordDate: meeting.scheduledAt,
    formCode: FORM_CODE.TAILGATE,
    recordHash,
    title: "Tailgate safety meeting",
    lines: [
      meeting.project.name,
      `Project code: ${meeting.project.code || "PRJ"}`,
      `Date: ${content.date}`,
      `Topic: ${meeting.topic}`,
      `Language: ${meeting.language}`,
      `Foreman: ${meeting.leaderName}`,
    ],
    sections: [
      { heading: "Points", body: meeting.discussionPoints || "" },
      { heading: "Hazards", body: meeting.hazards || "" },
    ],
    events,
    replaceIfUnexported: true,
  });
}

export async function kioskUploadPaper(
  token: string,
  input: { pin: string; fileName: string; mimeType: string; bytes: Buffer },
  ctx: SignContext = {},
) {
  const opened = await openKiosk(token, ctx.ip);
  const meeting = await currentTailgate(opened.link.projectId);
  if (!meeting?.conductorEmployeeId) throw new AppError("tailgate_required");
  await verifyPin(meeting.conductorEmployeeId, input.pin, opened.tokenHash, opened.ip);
  const extension = paperExtension(input.mimeType, input.bytes);
  const digest = sha256(input.bytes);
  const fileName = `${(input.fileName || "paper-sheet").replace(/[^A-Za-z0-9._-]+/g, "-").slice(0, 60) || "paper-sheet"}.${extension}`;
  const document = await prisma.safetyDocument.create({
    data: {
      organizationId: opened.link.organizationId,
      projectId: opened.link.projectId,
      title: "Signed paper sheet",
      category: "PAPER_SCAN_INBOX",
      fileName,
      mimeType: input.mimeType,
      byteSize: input.bytes.length,
      sha256: digest,
      contentBytes: asBytes(input.bytes),
      storageProvider: "DATABASE",
      createdById: meeting.conductorEmployeeId,
    },
  });
  const paper = await prisma.paperOriginal.create({
    data: {
      organizationId: opened.link.organizationId,
      recordType: "TAILGATE",
      recordId: meeting.id,
      projectId: opened.link.projectId,
      recordDate: meeting.scheduledAt,
      formCode: FORM_CODE.TAILGATE,
      fileName,
      sha256: digest,
      pages: extension === "pdf" ? pdfPages(input.bytes) : 1,
      source: "kiosk",
      documentId: document.id,
    },
  });
  return { documentId: document.id, paperId: paper.id };
}

function paperExtension(mime: string, bytes: Buffer) {
  if (bytes.length < 8 || bytes.length > MAX_FILE_BYTES) throw new AppError("file_too_large");
  if (mime === "image/jpeg" && bytes[0] === 0xff && bytes[1] === 0xd8) return "jpg";
  if (mime === "application/pdf" && bytes.subarray(0, 5).toString("utf8") === "%PDF-") return "pdf";
  if ((mime === "image/heic" || mime === "image/heif") && bytes.subarray(4, 8).toString("utf8") === "ftyp") return "heic";
  throw new AppError("file_type");
}

function pdfPages(bytes: Buffer) {
  const matches = bytes.toString("latin1").match(/\/Type\s*\/Page\b/g);
  return Math.max(1, matches?.length ?? 1);
}

export async function reviseLockedTailgate(actor: Actor, meetingId: string, input: unknown) {
  assertCan(actor, "write_operations");
  const meeting = await requireMeeting(actor, meetingId);
  if (!meeting.crewSign || !meeting.signLockedAt) throw new AppError("not_locked");
  const data = readRevise(input);
  const topic = tailgateTopic(data.topicCode);
  if (!topic) throw new AppError("invalid", "topicCode");
  const title = data.language === "es" ? topic.titleEs : topic.titleEn;
  const previous = meeting.signRevision;
  try {
    await prisma.$transaction(async (tx) => {
      if (meeting.projectId) await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${meeting.projectId}))`;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${meetingId}))`;
      const fresh = await tx.safetyMeeting.findFirst({ where: { id: meetingId, organizationId: actor.organizationId } });
      if (!fresh?.crewSign || !fresh.signLockedAt) throw new AppError("not_locked");
      const open = await tx.safetyMeeting.findFirst({
        where: {
          projectId: fresh.projectId,
          crewSign: true,
          signLockedAt: null,
          status: { not: "ARCHIVED" },
          NOT: { id: meetingId },
        },
        select: { id: true },
      });
      if (open) throw new AppError("tailgate_open");
      const events = await tx.signatureEvent.findMany({
      where: {
        organizationId: actor.organizationId,
        recordType: "TAILGATE",
        recordId: meetingId,
        recordRevision: previous,
      },
      select: { id: true },
    });
    for (const event of events) {
      await tx.signatureVoid.create({
        data: {
          organizationId: actor.organizationId,
          eventId: event.id,
          recordType: "TAILGATE",
          recordId: meetingId,
          recordRevision: previous,
          reason: "Content changed after finish. Prior signatures are void.",
          voidedByUserId: actor.userId,
        },
      });
    }
    await tx.safetyMeeting.update({
      where: { id: meetingId },
      data: {
        signRevision: { increment: 1 },
        signLockedAt: null,
        status: "SCHEDULED",
        title,
        topic: title,
        topicCode: topic.code,
        requirementCode: topic.citation,
        language: data.language,
        discussionPoints: data.points,
        hazards: data.hazards,
      },
    });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new AppError("tailgate_open");
    throw error;
  }
  await audit(prisma, actor, "revise_tailgate", "SafetyMeeting", meetingId, { fromRevision: previous });
  return prisma.safetyMeeting.findUniqueOrThrow({ where: { id: meetingId } });
}

export async function createSignRequest(actor: Actor, input: unknown) {
  assertCan(actor, "write_operations");
  const data = readSignRequest(input);
  if (data.projectId) await requireProject(actor, data.projectId);
  const recordId = data.recordId?.trim() || randomUUID();
  return prisma.signRequest.create({
    data: {
      organizationId: actor.organizationId,
      projectId: data.projectId,
      recordType: data.recordType,
      recordId,
      title: data.title,
      body: data.body,
      language: data.language,
      formCode: data.formCode.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12) || "FORM",
      createdByUserId: actor.userId,
    },
  });
}

export async function listAwaitingSignatures(actor: Actor) {
  if (actor.role !== "ADMIN") return [];
  return prisma.signRequest.findMany({
    where: { organizationId: actor.organizationId, status: "AWAITING" },
    orderBy: { createdAt: "asc" },
    include: { project: { select: { name: true, code: true } } },
  });
}

export async function ownerSign(actor: Actor, input: unknown, ctx: SignContext = {}) {
  assertCan(actor, "manage_org");
  const data = readOwnerSign(input);
  if (data.signerName && !sameName(data.signerName, actor.name)) throw new AppError("not_your_signature");
  if (!sameName(data.typedName, actor.name)) throw new AppError("not_your_signature");
  const request = await prisma.signRequest.findFirst({
    where: { id: data.requestId, organizationId: actor.organizationId, status: "AWAITING" },
    include: { project: true },
  });
  if (!request) throw new AppError("not_awaiting");
  const user = await prisma.user.findUnique({ where: { id: actor.userId } });
  if (!user) throw new AppError("not_found");
  const passwordOk = await compare(data.password, user.passwordHash);
  if (!passwordOk) throw new AppError("invalid_credentials");
  const png = decodeSignaturePng(data.signaturePng);
  const strokes = parseStrokes(data.strokes);
  const meta = contextOf(ctx);
  const recordHash = recordDigest({
    body: request.body,
    formCode: request.formCode,
    language: request.language,
    recordId: request.recordId,
    revision: request.revision,
    title: request.title,
    type: request.recordType,
  });
  const signedAt = new Date();
  const event = await prisma.$transaction(async (tx) => {
    const created = await appendEvent(tx, {
      organizationId: actor.organizationId,
      recordType: request.recordType,
      recordId: request.recordId,
      recordRevision: request.revision,
      employeeId: null,
      userId: actor.userId,
      signerName: actor.name,
      roleLabel: "owner",
      companyName: null,
      attestationText: ownerAttestation(request.language),
      attestationLang: request.language,
      method: "password+drawn",
      signatureImage: png,
      strokes,
      typedName: actor.name,
      consentTextId: null,
      ip: meta.ip,
      userAgent: meta.userAgent,
      deviceId: meta.deviceId,
      signedAt,
      late: false,
      flagged: false,
      recordHash,
    });
    await tx.signRequest.update({ where: { id: request.id }, data: { status: "SIGNED" } });
    return created;
  });
  const pdf = await storePdf({
    organizationId: actor.organizationId,
    projectId: request.projectId,
    projectCode: request.project?.code ?? null,
    recordType: request.recordType,
    recordId: request.recordId,
    revision: request.revision,
    recordDate: signedAt,
    formCode: request.formCode,
    recordHash,
    title: request.title,
    lines: [request.recordType, `Revision ${request.revision}`],
    sections: [{ heading: "Record", body: request.body }],
    events: [toChain(event)],
  });
  await audit(prisma, actor, "owner_sign", request.recordType, request.recordId, { eventId: event.id });
  return { eventId: event.id, pdfId: pdf.id };
}

export async function verifyOrganization(organizationId: string, recordId?: string) {
  const events = await loadOrgChain(organizationId);
  const chain = verifyChain(events);
  const scoped = recordId ? events.filter((event) => event.recordId === recordId) : events;
  const pdf = recordId
    ? await prisma.signedRecordPdf.findFirst({
        where: { organizationId, recordId },
        orderBy: { revision: "desc" },
        select: { id: true, sha256: true, revision: true, fileName: true, recordType: true },
      })
    : null;
  return {
    ok: chain.ok && (!recordId || scoped.length > 0),
    reason: chain.ok ? undefined : chain.reason,
    eventCount: scoped.length,
    chainEventCount: events.length,
    pdf,
  };
}

export async function readSignedPdf(actor: Actor, id: string) {
  if (actor.role === "WORKER") throw new AppError("forbidden");
  const pdf = await prisma.signedRecordPdf.findFirst({ where: { id, organizationId: actor.organizationId } });
  if (!pdf) throw new AppError("not_found");
  return pdf;
}

export async function posterForToken(actor: Actor, token: string, origin: string) {
  assertCan(actor, "write_operations");
  const tokenHash = sha256(token || "missing");
  const link = await prisma.kioskLink.findFirst({
    where: { tokenHash, active: true, organizationId: actor.organizationId },
    include: { project: true },
  });
  if (!link) throw new AppError("token_invalid");
  const { default: QRCode } = await import("qrcode");
  const url = `${origin.replace(/\/$/, "")}/k/${token}`;
  const qr = await QRCode.toBuffer(url, { type: "png", width: 600, margin: 1 });
  const { buildPosterPdf } = await import("../sign/pdf");
  const bytes = await buildPosterPdf({
    projectName: link.project.name,
    projectCode: link.project.code,
    url,
    qrPng: qr,
  });
  return { bytes: Buffer.from(bytes), fileName: `${link.project.code || "PRJ"}_KIOSK_POSTER.pdf` };
}

export async function listMeetingSignatures(actor: Actor, meetingId: string) {
  const meeting = await requireMeeting(actor, meetingId);
  const events = await prisma.signatureEvent.findMany({
    where: { organizationId: actor.organizationId, recordType: "TAILGATE", recordId: meetingId },
    orderBy: { signedAt: "asc" },
  });
  const voids = await prisma.signatureVoid.findMany({
    where: { eventId: { in: events.map((event) => event.id) } },
  });
  const pdfs = await prisma.signedRecordPdf.findMany({
    where: { organizationId: actor.organizationId, recordType: "TAILGATE", recordId: meetingId },
    orderBy: { revision: "asc" },
    select: { id: true, revision: true, fileName: true, sha256: true, completedAt: true },
  });
  const papers = await prisma.paperOriginal.findMany({
    where: { organizationId: actor.organizationId, recordId: meetingId },
    orderBy: { createdAt: "asc" },
  });
  return { meeting, events, voids, pdfs, papers };
}

export async function crewSignStats(organizationId: string, meetings: { id: string; signRevision: number; signLockedAt: Date | null }[]) {
  const ids = meetings.map((meeting) => meeting.id);
  if (ids.length === 0) return new Map<string, { signedCount: number; attendeeCount: number; conductorSigned: boolean; compliant: boolean }>();
  const events = await prisma.signatureEvent.findMany({
    where: { organizationId, recordType: "TAILGATE", recordId: { in: ids } },
    select: { id: true, recordId: true, recordRevision: true, roleLabel: true },
  });
  const voids = await prisma.signatureVoid.findMany({
    where: { eventId: { in: events.map((event) => event.id) } },
    select: { eventId: true },
  });
  const voided = new Set(voids.map((row) => row.eventId));
  const stats = new Map<string, { signedCount: number; attendeeCount: number; conductorSigned: boolean; compliant: boolean }>();
  for (const meeting of meetings) {
    const rows = events.filter((event) => event.recordId === meeting.id && event.recordRevision === meeting.signRevision && !voided.has(event.id));
    const attendees = rows.filter((event) => event.roleLabel === "attendee" || event.roleLabel === "visitor");
    const conductorSigned = rows.some((event) => event.roleLabel === "foreman");
    stats.set(meeting.id, {
      signedCount: attendees.length,
      attendeeCount: attendees.length,
      conductorSigned,
      compliant: Boolean(meeting.signLockedAt) && conductorSigned,
    });
  }
  return stats;
}

export { verifyChain, tailgateAttestation };
