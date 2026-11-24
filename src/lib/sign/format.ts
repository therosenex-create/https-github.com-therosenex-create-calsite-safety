import { sha256 } from "../fingerprint";
import { canonicalJson } from "./canonical";
import { pacificTodayInput } from "../time";

export const FORM_CODE: Record<string, string> = {
  TAILGATE: "TG",
  TRAINING_ACK: "TRN",
  JHA_SIGNOFF: "JHA",
  INSPECTION: "INS",
  CP_ACCEPTANCE: "CP",
  PROGRAM_ADOPTION: "PRG",
  ESIGN_CONSENT: "CONS",
};

export function employeeName(person: { firstName: string; lastName: string }) {
  return `${person.firstName} ${person.lastName}`.replace(/\s+/g, " ").trim();
}

export function sameName(left: string, right: string) {
  return left.trim().toLowerCase().replace(/\s+/g, " ") === right.trim().toLowerCase().replace(/\s+/g, " ");
}

export function summarizeUserAgent(value: string | null | undefined) {
  if (!value) return null;
  const clean = value.replace(/[^\x20-\x7E]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 160);
  return clean || null;
}

export function pacificStamp(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";
  const hour = get("hour") === "24" ? "00" : get("hour");
  return `${get("year")}-${get("month")}-${get("day")} ${hour}:${get("minute")} PT`;
}

export function utcStamp(date: Date) {
  return `${date.toISOString()} UTC`;
}

export function meetingDate(date: Date) {
  return pacificTodayInput(date);
}

export function signedFileName(projectCode: string | null | undefined, formCode: string, recordType: string, recordDate: string, revision: number) {
  const project = (projectCode || "PRJ").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12) || "PRJ";
  const form = formCode.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12) || "FORM";
  const type = recordType.replace(/[^A-Z0-9_]/g, "") || "RECORD";
  return `${project}_${form}_${type}_${recordDate}_ESIGNED_r${revision}.pdf`;
}

export function recordDigest(content: unknown) {
  return sha256(canonicalJson(content));
}

export function tailgateAttestation(language: string, date: string) {
  if (language === "es") return `Asistí a esta reunión el ${date} y entendí los temas.`;
  return `I attended this meeting on ${date} and understood the topics.`;
}

export function ownerAttestation(language: string) {
  if (language === "es") return "Adopto esta revisión como registro de la empresa. Esta es mi firma.";
  return "I adopt this revision as the company's record. This is my signature.";
}

export const CONSENT_VERSION = "2026-11-24";

export const CONSENT_BODY: Record<"en" | "es", string> = {
  en: `I agree to sign safety records electronically in CalSite Safety. This electronic signature is my own act. I understand I may sign on paper instead. A paper signature sheet is always available, and choosing paper does not change my job. Consent version ${CONSENT_VERSION}.`,
  es: `Acepto firmar los registros de seguridad de forma electrónica en CalSite Safety. Esta firma electrónica es mi propio acto. Entiendo que puedo firmar en papel. Siempre hay una hoja de firma en papel, y elegir papel no cambia mi trabajo. Versión del consentimiento ${CONSENT_VERSION}.`,
};

export function methodLabel(method: string) {
  if (method === "pin+drawn") return "pin+drawn";
  if (method === "password+drawn") return "password+drawn";
  if (method === "drawn_unenrolled") return "drawn_unenrolled";
  return method;
}
