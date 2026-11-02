import { z } from "zod";
import { AppError } from "./errors";
import { parseDateOnly, pacificLocalToUtc } from "./time";

const text = (min: number, max: number) => z.string().trim().min(min, "too_small").max(max, "too_big");
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, "too_big")
    .optional()
    .or(z.literal(""))
    .transform((value) => (value ? value : null));

const dateOnly = z
  .string()
  .optional()
  .or(z.literal(""))
  .transform((value, ctx) => {
    if (!value) return null;
    try {
      return parseDateOnly(value);
    } catch {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "invalid" });
      return z.NEVER;
    }
  });

const requiredDateOnly = z.string().transform((value, ctx) => {
  try {
    const parsed = parseDateOnly(value);
    if (!parsed) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "too_small" });
      return z.NEVER;
    }
    return parsed;
  } catch {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "invalid" });
    return z.NEVER;
  }
});

const pacificDateTime = z.string().transform((value, ctx) => {
  try {
    return pacificLocalToUtc(value);
  } catch {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "invalid" });
    return z.NEVER;
  }
});

export const passwordSchema = z
  .string()
  .min(10, "password_rules")
  .max(200, "password_too_long")
  .refine((value) => Buffer.byteLength(value) <= 72, "password_too_long")
  .refine((value) => /[A-Za-z]/.test(value) && /[0-9]/.test(value), "password_rules");

export const registerSchema = z.object({
  companyName: text(2, 160),
  name: text(2, 120),
  email: z.string().trim().email("invalid").max(200).transform((value) => value.toLowerCase()),
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((value) => value.password === value.confirmPassword, {
  message: "password_mismatch",
  path: ["confirmPassword"],
});

export const projectSchema = z
  .object({
    name: text(2, 160),
    jobsiteName: optionalText(160),
    streetAddress: text(3, 200),
    city: text(2, 80),
    county: text(2, 80),
    state: z.string().trim().length(2, "invalid").transform((value) => value.toUpperCase()),
    postalCode: optionalText(12),
    ownerType: z.enum(["PRIVATE", "PUBLIC_AGENCY", "SCHOOL_OR_COLLEGE", "SPECIAL_DISTRICT", "HOMEOWNER", "UNKNOWN"]),
    ownerName: optionalText(160),
    publicWorksStatus: z.enum([
      "UNKNOWN",
      "POTENTIALLY_APPLICABLE",
      "NOT_APPLICABLE",
      "APPLICABLE",
      "PENDING_QUALIFIED_REVIEW",
    ]),
    publicWorksRationale: z.string().trim().max(2000, "too_big").optional().or(z.literal("")).transform((value) => value ?? ""),
    description: optionalText(4000),
    scopeOfWork: optionalText(4000),
    status: z.enum(["PLANNED", "ACTIVE", "ON_HOLD", "COMPLETE"]),
    startDate: dateOnly,
    endDate: dateOnly,
    jurisdictionConfirmed: z.enum(["yes", "no"]).transform((value) => value === "yes"),
  })
  .superRefine((value, ctx) => {
    if (value.publicWorksStatus !== "UNKNOWN" && value.publicWorksRationale.trim().length < 20) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["publicWorksRationale"], message: "rationale_required" });
    }
  });

export const employeeSchema = z.object({
  firstName: text(1, 80),
  lastName: text(1, 80),
  email: z
    .string()
    .trim()
    .max(200)
    .optional()
    .or(z.literal(""))
    .transform((value) => (value ? value.toLowerCase() : null))
    .refine((value) => value === null || z.string().email().safeParse(value).success, "invalid"),
  phone: optionalText(40),
  jobTitle: optionalText(80),
  trade: optionalText(80),
  preferredLanguage: z.enum(["en", "es"]),
  hireDate: dateOnly,
  status: z.enum(["ACTIVE", "INACTIVE"]),
});

export const meetingSchema = z.object({
  projectId: z.string().trim().min(1).optional().or(z.literal("")).transform((value) => value || null),
  title: text(2, 160),
  topic: text(2, 160),
  language: z.enum(["en", "es"]),
  scheduledAt: pacificDateTime,
  leaderName: text(2, 120),
  policyBasis: z.enum(["COMPANY_POLICY", "CONTRACT_REQUIREMENT", "RECORDED_AGAINST_CITATION"]),
  requirementCode: optionalText(80),
  discussionPoints: optionalText(4000),
  workerQuestions: optionalText(4000),
  followUp: optionalText(2000),
  notes: optionalText(4000),
  status: z.enum(["SCHEDULED", "COMPLETE"]),
});

export const trainingSchema = z.object({
  employeeId: z.string().trim().min(1, "too_small"),
  projectId: z.string().trim().optional().or(z.literal("")).transform((value) => value || null),
  topic: text(2, 160),
  provider: optionalText(160),
  completedOn: requiredDateOnly,
  expiresOn: dateOnly,
  evidenceNote: optionalText(2000),
});

export const inspectionSchema = z.object({
  projectId: z.string().trim().min(1, "too_small"),
  category: z.enum([
    "general",
    "walking_surfaces",
    "fall_protection",
    "ladders",
    "scaffolds",
    "excavation",
    "electrical",
    "ppe",
    "housekeeping",
    "heat",
    "emergency",
    "other",
  ]),
  inspectedAt: pacificDateTime,
  inspectorName: text(2, 120),
  location: optionalText(160),
  summary: text(2, 4000),
  status: z.enum(["OPEN", "CLOSED"]),
});

export const findingSchema = z.object({
  description: text(2, 4000),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "IMMINENT_DANGER"]),
  immediateAction: optionalText(2000),
});

export const correctiveActionSchema = z.object({
  description: text(2, 4000),
  responsibleName: text(2, 120),
  dueDate: dateOnly,
  evidenceNote: optionalText(2000),
  status: z.enum(["OPEN", "COMPLETE"]),
});

export const incidentSchema = z.object({
  projectId: z.string().trim().optional().or(z.literal("")).transform((value) => value || null),
  type: z.enum(["INJURY", "ILLNESS", "NEAR_MISS", "PROPERTY_DAMAGE", "EXPOSURE", "OTHER"]),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "IMMINENT_DANGER"]),
  occurredAt: pacificDateTime,
  location: optionalText(160),
  description: text(2, 4000),
  immediateActions: optionalText(2000),
  peopleInvolved: optionalText(500),
  investigationNotes: optionalText(4000),
  status: z.enum(["OPEN", "UNDER_REVIEW", "CLOSED"]),
});

export const documentSchema = z.object({
  projectId: z.string().trim().optional().or(z.literal("")).transform((value) => value || null),
  title: text(2, 160),
  category: z.enum(["iipp", "code_of_safe_practices", "sds", "training", "inspection", "permit", "incident", "other"]),
  description: optionalText(4000),
});

export const applicabilitySchema = z.object({
  requirementId: z.string().trim().min(1),
  projectId: z.string().trim().optional().or(z.literal("")).transform((value) => value || null),
  applicability: z.enum([
    "APPLICABLE",
    "POTENTIALLY_APPLICABLE",
    "NOT_APPLICABLE",
    "CONTRACTUALLY_REQUIRED",
    "RECOMMENDED_PRACTICE",
    "PENDING_QUALIFIED_REVIEW",
    "SUPERSEDED",
    "VERIFICATION_OVERDUE",
  ]),
  rationale: text(20, 2000),
  responsibleRole: optionalText(120),
});

export const evidenceLinkSchema = z.object({
  requirementId: z.string().trim().min(1),
  projectId: optionalText(80),
  recordKind: z.enum(["document", "inspection", "meeting", "training", "incident"]),
  recordId: z.string().trim().min(1, "too_small"),
  status: z.enum(["UPLOADED", "REVIEWED", "APPROVED", "COMPLETED"]),
  note: text(2, 2000),
});

export const orgSchema = z.object({
  name: text(2, 160),
  legalName: optionalText(160),
  dba: optionalText(160),
  mailingCity: optionalText(80),
  mailingState: optionalText(2),
  cslbLicenseNumber: optionalText(40),
  cslbClassification: optionalText(120),
  dirRegistrationNumber: optionalText(40),
});

export const licenseCheckSchema = z.object({
  kind: z.enum(["CSLB", "DIR_PWCR"]),
  status: z.enum([
    "VERIFICATION_REQUIRED",
    "LOOKUP_FAILED",
    "MANUALLY_RECORDED",
    "STALE",
    "EXPIRED",
    "SUSPENDED",
    "INACTIVE",
    "CANCELED",
  ]),
  note: text(20, 2000),
  documentId: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .transform((value) => value || null),
});

export const reviewSchema = z.object({
  requirementId: z.string().trim().min(1, "too_small"),
  decision: z.enum(["STILL_PENDING", "SOURCE_READ_WITH_LIMITATIONS", "NEEDS_ANOTHER_PASS"]),
  note: text(40, 4000),
  acknowledgedNotCertification: z.string().refine((value) => value === "yes", "acknowledge_required"),
});

const optionalUrl = z
  .string()
  .trim()
  .max(500, "too_big")
  .optional()
  .or(z.literal(""))
  .transform((value) => value || null)
  .refine((value) => value === null || /^https?:\/\//i.test(value), "invalid");

export const permitSchema = z.object({
  projectId: z.string().trim().min(1, "too_small"),
  authorityName: text(2, 160),
  jurisdictionLabel: text(2, 160),
  permitType: text(2, 120),
  permitNumber: optionalText(80),
  status: z.enum(["NOT_STARTED", "DRAFT", "SUBMITTED", "CORRECTIONS", "USER_REPORTED_APPROVAL", "ISSUED", "CLOSED", "UNKNOWN"]),
  appliedOn: dateOnly,
  issuedOn: dateOnly,
  expiresOn: dateOnly,
  closedOn: dateOnly,
  notes: optionalText(4000),
  officialUrl: optionalUrl,
  documentId: z.string().trim().optional().or(z.literal("")).transform((value) => value || null),
  permitCategory: z
    .union([z.enum(["building", "demolition", "electrical", "mechanical", "plumbing", "grading", "excavation", "encroachment", "fire", "other", "custom"]), z.literal("")])
    .optional()
    .transform((value) => value || undefined),
});

export const heatPlanSchema = z.object({
  projectId: z.string().trim().optional().or(z.literal("")).transform((value) => value || null),
  waterProcedure: text(10, 4000),
  shadeProcedure: text(10, 4000),
  highHeatProcedure: text(10, 4000),
  emergencyProcedure: text(10, 4000),
  trainingNote: optionalText(2000),
});

export const smokePlanSchema = z.object({
  projectId: z.string().trim().optional().or(z.literal("")).transform((value) => value || null),
  manualCheckProcedure: text(20, 4000),
  controlNote: text(10, 4000),
  respiratorNote: optionalText(2000),
});

export const publicWorksSchema = z.object({
  projectId: z.string().trim().min(1, "too_small"),
  awardingBody: text(2, 160),
  registrationEvidenceNote: text(20, 4000),
  registrationDocumentId: z.string().trim().optional().or(z.literal("")).transform((value) => value || null),
  wageDeterminationId: optionalText(120),
  wageNote: text(10, 2000),
  apprenticeshipCraft: optionalText(120),
  apprenticeshipNote: optionalText(2000),
});

export const payrollDraftSchema = z.object({
  projectId: z.string().trim().min(1, "too_small"),
  weekEnding: requiredDateOnly,
  note: text(10, 2000),
});

export const citySourceSchema = z.object({
  cityName: text(2, 80),
  countyName: text(2, 80),
  subject: text(2, 160),
  officialUrl: optionalUrl,
  notes: text(20, 4000),
  agencyKind: z
    .union([z.enum(["CITY", "COUNTY", "FIRE", "WATER", "SCHOOL_DISTRICT", "CALTRANS_DISTRICT", "OTHER"]), z.literal("")])
    .optional()
    .transform((value) => value || undefined),
  contactName: optionalText(120),
  contactPhone: optionalText(40),
  contactEmail: optionalText(200),
  caltransDistrictNote: optionalText(500),
});

export const localRuleSchema = z.object({
  projectId: z.string().trim().optional().or(z.literal("")).transform((value) => value || null),
  requirementId: z.string().trim().optional().or(z.literal("")).transform((value) => value || null),
  topic: z.enum(["LOCAL_AMENDMENT", "FIRE_APPROVAL", "ENVIRONMENTAL", "RIGHT_OF_WAY", "OTHER"]),
  ruleText: text(10, 4000),
  citationUrl: optionalUrl,
  rationale: optionalText(2000),
  reviewStatus: z
    .union([z.enum(["UNREVIEWED", "PENDING_QUALIFIED_REVIEW", "SOURCE_LINKED", "NEEDS_UPDATE"]), z.literal("")])
    .optional()
    .transform((value) => value || undefined),
  documentId: z.string().trim().optional().or(z.literal("")).transform((value) => value || null),
});

export const closeoutSchema = z.object({
  projectId: z.string().trim().min(1, "too_small"),
  itemKey: z.enum([
    "REGISTRATION_NOTE",
    "DETERMINATION_ID",
    "PAYROLL_DRAFTS",
    "APPRENTICESHIP_NOTE",
    "FINAL_PAYROLL",
    "FINAL_DOCS",
    "SIGNOFF",
  ]),
  note: optionalText(4000),
  documentId: z.string().trim().optional().or(z.literal("")).transform((value) => value || null),
  signoffName: optionalText(120),
  acknowledgedNotASignature: z.string().optional().or(z.literal("")),
});

export const packetSchema = z.object({
  projectId: z.string().trim().optional().or(z.literal("")).transform((value) => value || null),
  title: text(2, 160),
  purposeNote: text(10, 2000),
});

export const packetItemSchema = z.object({
  packetId: z.string().trim().min(1, "too_small"),
  kind: z.enum(["MEETING", "INSPECTION", "INCIDENT", "PERMIT", "DOCUMENT", "PUBLIC_WORKS"]),
  recordId: z.string().trim().min(1, "too_small"),
});

export const catalogSearchSchema = z.object({
  q: z.string().trim().max(80).optional().or(z.literal("")),
  reviewStatus: z
    .union([z.enum(["UNREVIEWED", "PENDING_QUALIFIED_REVIEW", "SOURCE_LINKED", "NEEDS_UPDATE", "RETIRED"]), z.literal("")])
    .optional()
    .transform((value) => value || undefined),
  jurisdiction: z.string().trim().max(80).optional().or(z.literal("")).transform((value) => value || undefined),
  applicability: z
    .union([
      z.enum([
        "APPLICABLE",
        "POTENTIALLY_APPLICABLE",
        "NOT_APPLICABLE",
        "CONTRACTUALLY_REQUIRED",
        "RECOMMENDED_PRACTICE",
        "PENDING_QUALIFIED_REVIEW",
        "SUPERSEDED",
        "VERIFICATION_OVERDUE",
      ]),
      z.literal(""),
    ])
    .optional()
    .transform((value) => value || undefined),
});

export const inviteSchema = z.object({
  name: text(2, 120),
  email: z.string().trim().email("invalid").max(200).transform((value) => value.toLowerCase()),
  password: passwordSchema,
  role: z.enum(["ADMIN", "SAFETY_MANAGER", "WORKER"]),
});

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, "too_small"),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "password_mismatch",
    path: ["confirmPassword"],
  });

// Transforms make Zod's input type differ from its output. The third generic stays open on purpose.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseInput<T>(schema: z.ZodType<T, z.ZodTypeDef, any>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issue = result.error.issues[0];
    const field = String(issue?.path[0] ?? "form");
    const message = issue?.message ?? "invalid";
    const code = /^[a-z0-9_]+$/.test(message) ? message : "invalid";
    throw new AppError(code, field);
  }
  return result.data;
}

export type ProjectInput = z.infer<typeof projectSchema>;
export type EmployeeInput = z.infer<typeof employeeSchema>;
export type MeetingInput = z.infer<typeof meetingSchema>;
export type TrainingInput = z.infer<typeof trainingSchema>;
export type InspectionInput = z.infer<typeof inspectionSchema>;
export type FindingInput = z.infer<typeof findingSchema>;
export type CorrectiveInput = z.infer<typeof correctiveActionSchema>;
export type IncidentInput = z.infer<typeof incidentSchema>;
export type DocumentInput = z.infer<typeof documentSchema>;
