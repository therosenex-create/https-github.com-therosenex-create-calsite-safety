import { sha256 } from "../fingerprint";
import { canonicalJson } from "./canonical";

export type ChainEvent = {
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
  strokes: unknown;
  typedName: string;
  userAgent: string | null;
  userId: string | null;
};

export function eventHashPayload(event: Omit<ChainEvent, "eventHash">) {
  return {
    attestationLang: event.attestationLang,
    attestationText: event.attestationText,
    companyName: event.companyName,
    consentTextId: event.consentTextId,
    deviceId: event.deviceId,
    employeeId: event.employeeId,
    flagged: event.flagged,
    ip: event.ip,
    late: event.late,
    method: event.method,
    organizationId: event.organizationId,
    prevEventHash: event.prevEventHash,
    recordHash: event.recordHash,
    recordId: event.recordId,
    recordRevision: event.recordRevision,
    recordType: event.recordType,
    roleLabel: event.roleLabel,
    signatureImageSha256: sha256(Buffer.from(event.signatureImage)),
    signedAt: event.signedAt.toISOString(),
    signerName: event.signerName,
    strokes: event.strokes,
    typedName: event.typedName,
    userAgent: event.userAgent,
    userId: event.userId,
  };
}

export function computeEventHash(event: Omit<ChainEvent, "eventHash">) {
  return sha256(canonicalJson(eventHashPayload(event)));
}

export function verifyChain(events: ChainEvent[]): { ok: true } | { ok: false; reason: string } {
  if (events.length === 0) return { ok: true };
  const byHash = new Map<string, ChainEvent>();
  for (const event of events) {
    if (byHash.has(event.eventHash)) return { ok: false, reason: "duplicate_event_hash" };
    if (computeEventHash(event) !== event.eventHash) return { ok: false, reason: "event_hash_mismatch" };
    byHash.set(event.eventHash, event);
  }
  const heads = events.filter((event) => !event.prevEventHash);
  if (heads.length !== 1) return { ok: false, reason: "chain_head" };
  const seen = new Set<string>();
  let cursor: ChainEvent | undefined = heads[0];
  while (cursor) {
    if (seen.has(cursor.eventHash)) return { ok: false, reason: "cycle" };
    seen.add(cursor.eventHash);
    const children = events.filter((event) => event.prevEventHash === cursor?.eventHash);
    if (children.length > 1) return { ok: false, reason: "fork" };
    cursor = children[0];
  }
  if (seen.size !== events.length) return { ok: false, reason: "unreachable" };
  return { ok: true };
}
