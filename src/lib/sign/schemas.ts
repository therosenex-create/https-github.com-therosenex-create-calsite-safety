import { z } from "zod";
import { parseInput } from "../validation";
import { TAILGATE_TOPIC_CODES } from "../tailgate-topics";

const pin = z.string().regex(/^\d{4,6}$/, "invalid_pin");

export const enrollSchema = z
  .object({
    employeeId: z.string().trim().min(1, "too_small"),
    language: z.enum(["en", "es"]),
    agreed: z.literal("yes", { errorMap: () => ({ message: "consent_required" }) }),
    printedName: z.string().trim().min(2, "too_small").max(120, "too_big"),
    pin,
    confirmPin: z.string(),
    signaturePng: z.string().min(20, "signature_required"),
    strokes: z.string().min(2, "signature_required"),
  })
  .refine((value) => value.pin === value.confirmPin, { message: "password_mismatch", path: ["confirmPin"] });

export const kioskStartSchema = z.object({
  employeeId: z.string().trim().min(1, "too_small"),
  pin,
  topicCode: z.enum(TAILGATE_TOPIC_CODES),
  points: z.string().trim().min(2, "too_small").max(4000, "too_big"),
  hazards: z.string().trim().max(4000, "too_big").optional().or(z.literal("")).transform((value) => value ?? ""),
  language: z.enum(["en", "es"]),
});

export const kioskSignSchema = z.object({
  employeeId: z.string().trim().min(1, "too_small"),
  pin,
  attestation: z.literal("yes", { errorMap: () => ({ message: "attestation_required" }) }),
  signaturePng: z.string().min(20, "signature_required"),
  strokes: z.string().min(2, "signature_required"),
  typedName: z.string().trim().max(120).optional().or(z.literal("")),
  signerName: z.string().trim().max(120).optional().or(z.literal("")),
});

export const kioskVisitorSchema = z.object({
  visitorName: z.string().trim().min(2, "too_small").max(120, "too_big"),
  companyName: z.string().trim().min(2, "too_small").max(160, "too_big"),
  attestation: z.literal("yes", { errorMap: () => ({ message: "attestation_required" }) }),
  signaturePng: z.string().min(20, "signature_required"),
  strokes: z.string().min(2, "signature_required"),
  typedName: z.string().trim().min(2, "too_small").max(120, "too_big"),
});

export const kioskFinishSchema = z.object({
  employeeId: z.string().trim().min(1, "too_small"),
  pin,
});

export const signRequestSchema = z.object({
  recordType: z.enum(["TRAINING_ACK", "JHA_SIGNOFF", "INSPECTION", "CP_ACCEPTANCE", "PROGRAM_ADOPTION"]),
  recordId: z.string().trim().max(80).optional().or(z.literal("")),
  projectId: z.string().trim().optional().or(z.literal("")).transform((value) => value || null),
  title: z.string().trim().min(2, "too_small").max(180, "too_big"),
  body: z.string().trim().min(2, "too_small").max(8000, "too_big"),
  language: z.enum(["en", "es"]),
  formCode: z.string().trim().min(2, "too_small").max(12, "too_big"),
});

export const ownerSignSchema = z.object({
  requestId: z.string().trim().min(1, "too_small"),
  password: z.string().min(1, "too_small"),
  intent: z.literal("yes", { errorMap: () => ({ message: "attestation_required" }) }),
  typedName: z.string().trim().min(2, "too_small").max(120, "too_big"),
  signaturePng: z.string().min(20, "signature_required"),
  strokes: z.string().min(2, "signature_required"),
  signerName: z.string().trim().max(120).optional().or(z.literal("")),
});

export const reviseSchema = z.object({
  topicCode: z.enum(TAILGATE_TOPIC_CODES),
  points: z.string().trim().min(2, "too_small").max(4000, "too_big"),
  hazards: z.string().trim().max(4000, "too_big").optional().or(z.literal("")).transform((value) => value ?? ""),
  language: z.enum(["en", "es"]),
});

export function readEnroll(input: unknown) {
  return parseInput(enrollSchema, input);
}
export function readKioskStart(input: unknown) {
  return parseInput(kioskStartSchema, input);
}
export function readKioskSign(input: unknown) {
  return parseInput(kioskSignSchema, input);
}
export function readVisitor(input: unknown) {
  return parseInput(kioskVisitorSchema, input);
}
export function readFinish(input: unknown) {
  return parseInput(kioskFinishSchema, input);
}
export function readSignRequest(input: unknown) {
  return parseInput(signRequestSchema, input);
}
export function readOwnerSign(input: unknown) {
  return parseInput(ownerSignSchema, input);
}
export function readRevise(input: unknown) {
  return parseInput(reviseSchema, input);
}
