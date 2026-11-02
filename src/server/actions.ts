"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";
import { isAppError } from "@/lib/errors";
import { errorText, t, type Locale } from "@/lib/i18n";
import { getActor, getLocale } from "@/lib/session";
import {
  adminSetPassword,
  changePassword,
  enforceLoginRateLimit,
  inviteMember,
  recordLicenseCheck,
  registerCompany,
  revokeSessions,
  updateMemberRole,
  updateOrganization,
} from "@/lib/services/accounts";
import {
  acknowledgeOwnAttendance,
  addCorrectiveAction,
  addFinding,
  archiveDocument,
  archiveEmployee,
  archiveInspection,
  archiveMeeting,
  archiveProject,
  archiveTraining,
  assignCrew,
  createDocument,
  createEmployee,
  createIncident,
  createInspection,
  createMeeting,
  createProject,
  createTraining,
  removeCrew,
  saveChecklist,
  setAttendance,
  setFindingStatus,
  updateCorrectiveAction,
  updateEmployee,
  updateIncident,
  updateInspection,
  updateMeeting,
  updateProject,
  updateTraining,
} from "@/lib/services/work";
import { assignRequirement, flagSourceForManualReview, linkEvidence, updateIipp } from "@/lib/services/regulatory";
import { getMailer } from "@/lib/mailer";
import { createLocalRule, saveCloseoutItem } from "@/lib/services/local";
import { addPacketItem, createPacket } from "@/lib/services/packets";
import { createCitySource, createPermit, recordQualifiedReview } from "@/lib/services/records";
import { createHeatPlan, createPayrollDraft, createPublicWorksRecord, createSmokePlan } from "@/lib/services/field-ops";
import { prisma } from "@/lib/db";
import type { ActionState } from "@/components/action-form";

function values(formData: FormData, keys: string[]) {
  const data: Record<string, string> = {};
  for (const key of keys) {
    const value = formData.get(key);
    data[key] = typeof value === "string" ? value : "";
  }
  return data;
}

async function fail(error: unknown): Promise<ActionState> {
  const locale = await getLocale();
  if (isAppError(error)) return { error: errorText(locale, error.code, error.field) };
  console.error(error);
  return { error: errorText(locale, "generic") };
}

export async function setLocaleAction(formData: FormData) {
  const locale: Locale = formData.get("locale") === "es" ? "es" : "en";
  const jar = await cookies();
  jar.set("locale", locale, { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 365 });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}

export async function switchOrgAction(formData: FormData) {
  const actor = await getActor();
  const organizationId = String(formData.get("organizationId") ?? "");
  const membership = await prisma.membership.findFirst({
    where: { userId: actor.userId, organizationId },
  });
  if (!membership) return;
  const jar = await cookies();
  jar.set("calsite_org", organizationId, {
    path: "/",
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });
  redirect("/app");
}

export async function signInAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const locale = await getLocale();
  const email = String(formData.get("email") ?? "");
  try {
    await enforceLoginRateLimit(email);
  } catch (error) {
    return fail(error);
  }
  try {
    await signIn("credentials", {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      redirectTo: "/app",
    });
  } catch (error) {
    if (error instanceof AuthError) return { error: t(locale, "errors.invalid_credentials") };
    throw error;
  }
  return {};
}

export async function signUpAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await registerCompany(values(formData, ["companyName", "name", "email", "password", "confirmPassword"]));
  } catch (error) {
    return fail(error);
  }
  try {
    await signIn("credentials", {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      redirectTo: "/app",
    });
  } catch (error) {
    if (error instanceof AuthError) return fail(new Error("invalid"));
    throw error;
  }
  return {};
}

const projectKeys = [
  "name", "jobsiteName", "streetAddress", "city", "county", "state", "postalCode", "ownerType", "ownerName",
  "publicWorksStatus", "publicWorksRationale", "description", "scopeOfWork", "status", "startDate", "endDate", "jurisdictionConfirmed",
];

export async function createProjectAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  let id = "";
  try {
    const project = await createProject(await getActor(), values(formData, projectKeys));
    id = project.id;
  } catch (error) {
    return fail(error);
  }
  revalidatePath("/app/projects");
  redirect(`/app/projects/${id}`);
}

export async function updateProjectAction(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await updateProject(await getActor(), id, values(formData, projectKeys));
  } catch (error) {
    return fail(error);
  }
  revalidatePath(`/app/projects/${id}`);
  return {};
}

export async function archiveProjectAction(id: string) {
  await archiveProject(await getActor(), id);
  revalidatePath("/app/projects");
  redirect("/app/projects");
}

export async function assignCrewAction(projectId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await assignCrew(await getActor(), projectId, String(formData.get("employeeId") ?? ""));
  } catch (error) {
    return fail(error);
  }
  revalidatePath(`/app/projects/${projectId}`);
  return {};
}

export async function removeCrewAction(projectId: string, employeeId: string) {
  await removeCrew(await getActor(), projectId, employeeId);
  revalidatePath(`/app/projects/${projectId}`);
}

const employeeKeys = ["firstName", "lastName", "email", "phone", "jobTitle", "trade", "preferredLanguage", "hireDate", "status"];

export async function createEmployeeAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  let id = "";
  try {
    const employee = await createEmployee(await getActor(), values(formData, employeeKeys));
    id = employee.id;
  } catch (error) {
    return fail(error);
  }
  revalidatePath("/app/employees");
  redirect(`/app/employees/${id}`);
}

export async function updateEmployeeAction(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await updateEmployee(await getActor(), id, values(formData, employeeKeys));
  } catch (error) {
    return fail(error);
  }
  revalidatePath(`/app/employees/${id}`);
  return {};
}

export async function archiveEmployeeAction(id: string) {
  await archiveEmployee(await getActor(), id);
  revalidatePath("/app/employees");
  redirect("/app/employees");
}

const meetingKeys = [
  "projectId", "title", "topic", "language", "scheduledAt", "leaderName", "policyBasis", "requirementCode",
  "discussionPoints", "workerQuestions", "followUp", "notes", "status",
];

export async function createMeetingAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  let id = "";
  try {
    const meeting = await createMeeting(await getActor(), values(formData, meetingKeys));
    id = meeting.id;
  } catch (error) {
    return fail(error);
  }
  revalidatePath("/app/meetings");
  redirect(`/app/meetings/${id}`);
}

export async function updateMeetingAction(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await updateMeeting(await getActor(), id, values(formData, meetingKeys));
  } catch (error) {
    return fail(error);
  }
  revalidatePath(`/app/meetings/${id}`);
  return {};
}

export async function archiveMeetingAction(id: string) {
  await archiveMeeting(await getActor(), id);
  revalidatePath("/app/meetings");
  redirect("/app/meetings");
}

export async function attendanceAction(meetingId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const ids = formData.getAll("employeeId").map((value) => String(value));
    await setAttendance(await getActor(), meetingId, ids);
  } catch (error) {
    return fail(error);
  }
  revalidatePath(`/app/meetings/${meetingId}`);
  return {};
}

export async function acknowledgeAction(meetingId: string) {
  try {
    await acknowledgeOwnAttendance(await getActor(), meetingId);
  } catch (error) {
    console.error(error);
  }
  revalidatePath(`/app/meetings/${meetingId}`);
}

const trainingKeys = ["employeeId", "projectId", "topic", "provider", "completedOn", "expiresOn", "evidenceNote"];

export async function createTrainingAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  let id = "";
  try {
    const record = await createTraining(await getActor(), values(formData, trainingKeys));
    id = record.id;
  } catch (error) {
    return fail(error);
  }
  revalidatePath("/app/training");
  redirect(`/app/training/${id}`);
}

export async function updateTrainingAction(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await updateTraining(await getActor(), id, values(formData, trainingKeys));
  } catch (error) {
    return fail(error);
  }
  revalidatePath(`/app/training/${id}`);
  return {};
}

export async function archiveTrainingAction(id: string) {
  await archiveTraining(await getActor(), id);
  revalidatePath("/app/training");
  redirect("/app/training");
}

const inspectionKeys = ["projectId", "category", "inspectedAt", "inspectorName", "location", "summary", "status"];

export async function createInspectionAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  let id = "";
  try {
    const inspection = await createInspection(await getActor(), values(formData, inspectionKeys));
    id = inspection.id;
  } catch (error) {
    return fail(error);
  }
  revalidatePath("/app/inspections");
  redirect(`/app/inspections/${id}`);
}

export async function updateInspectionAction(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await updateInspection(await getActor(), id, values(formData, inspectionKeys));
  } catch (error) {
    return fail(error);
  }
  revalidatePath(`/app/inspections/${id}`);
  return {};
}

export async function archiveInspectionAction(id: string) {
  await archiveInspection(await getActor(), id);
  revalidatePath("/app/inspections");
  redirect("/app/inspections");
}

export async function checklistAction(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const answers = [];
    for (const [key, value] of formData.entries()) {
      if (!key.startsWith("result_")) continue;
      const itemKey = key.slice("result_".length);
      answers.push({ key: itemKey, result: String(value), note: String(formData.get(`note_${itemKey}`) ?? "") });
    }
    await saveChecklist(await getActor(), id, answers);
  } catch (error) {
    return fail(error);
  }
  revalidatePath(`/app/inspections/${id}`);
  return {};
}

export async function findingAction(inspectionId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await addFinding(await getActor(), inspectionId, values(formData, ["description", "severity", "immediateAction"]));
  } catch (error) {
    return fail(error);
  }
  revalidatePath(`/app/inspections/${inspectionId}`);
  return {};
}

export async function findingStatusAction(inspectionId: string, findingId: string, status: "OPEN" | "CORRECTED") {
  try {
    await setFindingStatus(await getActor(), findingId, status);
  } catch (error) {
    console.error(error);
  }
  revalidatePath(`/app/inspections/${inspectionId}`);
}

const actionKeys = ["description", "responsibleName", "dueDate", "evidenceNote", "status"];

export async function correctiveActionCreate(inspectionId: string, findingId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await addCorrectiveAction(await getActor(), findingId, values(formData, actionKeys));
  } catch (error) {
    return fail(error);
  }
  revalidatePath(`/app/inspections/${inspectionId}`);
  return {};
}

export async function correctiveActionUpdate(inspectionId: string, findingId: string, actionId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await updateCorrectiveAction(await getActor(), findingId, actionId, values(formData, actionKeys));
  } catch (error) {
    return fail(error);
  }
  revalidatePath(`/app/inspections/${inspectionId}`);
  return {};
}

const incidentKeys = ["projectId", "type", "severity", "occurredAt", "location", "description", "immediateActions", "peopleInvolved", "investigationNotes", "status"];

export async function createIncidentAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  let id = "";
  try {
    const incident = await createIncident(await getActor(), values(formData, incidentKeys));
    id = incident.id;
  } catch (error) {
    return fail(error);
  }
  revalidatePath("/app/incidents");
  redirect(`/app/incidents/${id}`);
}

export async function updateIncidentAction(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await updateIncident(await getActor(), id, values(formData, incidentKeys));
  } catch (error) {
    return fail(error);
  }
  revalidatePath(`/app/incidents/${id}`);
  return {};
}

export async function createDocumentAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  let id = "";
  try {
    const file = formData.get("file");
    let upload: { name: string; mimeType: string; bytes: Buffer } | null = null;
    if (file instanceof File && file.size > 0) {
      upload = { name: file.name, mimeType: file.type || "application/octet-stream", bytes: Buffer.from(await file.arrayBuffer()) };
    }
    const document = await createDocument(await getActor(), values(formData, ["projectId", "title", "category", "description"]), upload);
    id = document.id;
  } catch (error) {
    return fail(error);
  }
  revalidatePath("/app/documents");
  redirect(`/app/documents/${id}`);
}

export async function archiveDocumentAction(id: string) {
  await archiveDocument(await getActor(), id);
  revalidatePath("/app/documents");
  redirect("/app/documents");
}

export async function updateIippAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const procedures: Record<string, { procedure?: string; responsible?: string }> = {};
    for (const [key, value] of formData.entries()) {
      if (key.startsWith("procedure_")) {
        const element = key.slice("procedure_".length);
        procedures[element] = { ...procedures[element], procedure: String(value) };
      }
      if (key.startsWith("responsible_")) {
        const element = key.slice("responsible_".length);
        procedures[element] = { ...procedures[element], responsible: String(value) };
      }
    }
    await updateIipp(await getActor(), { procedures, claim: String(formData.get("implementationClaim") ?? "") });
  } catch (error) {
    return fail(error);
  }
  revalidatePath("/app/iipp");
  return {};
}

export async function assignRequirementAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await assignRequirement(await getActor(), values(formData, ["requirementId", "projectId", "applicability", "rationale", "responsibleRole"]));
  } catch (error) {
    return fail(error);
  }
  revalidatePath("/app/regulatory");
  return {};
}

export async function linkEvidenceAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await linkEvidence(await getActor(), values(formData, ["requirementId", "projectId", "recordKind", "recordId", "status", "note"]));
  } catch (error) {
    return fail(error);
  }
  return {};
}

export async function flagSourceAction(sourceId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await flagSourceForManualReview(await getActor(), sourceId, String(formData.get("note") ?? ""));
  } catch (error) {
    return fail(error);
  }
  revalidatePath(`/app/regulatory/sources/${sourceId}`);
  return {};
}

export async function updateOrgAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await updateOrganization(await getActor(), values(formData, ["name", "legalName", "dba", "mailingCity", "mailingState", "cslbLicenseNumber", "cslbClassification", "dirRegistrationNumber"]));
  } catch (error) {
    return fail(error);
  }
  revalidatePath("/app/settings");
  return {};
}

export async function licenseCheckAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await recordLicenseCheck(await getActor(), values(formData, ["kind", "status", "note", "documentId"]));
  } catch (error) {
    return fail(error);
  }
  revalidatePath("/app/settings");
  revalidatePath("/app/licensing");
  return {};
}

export async function inviteAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const locale = await getLocale();
  try {
    const actor = await getActor();
    const input = values(formData, ["name", "email", "password", "role"]);
    await inviteMember(actor, input);
    const mail = await getMailer().sendInvitation({
      to: input.email,
      companyName: actor.organizationName,
      inviteeName: input.name,
    });
    revalidatePath("/app/settings");
    return { notice: mail.delivered ? t(locale, "mail.sent") : t(locale, "mail.notSent") };
  } catch (error) {
    return fail(error);
  }
}

export async function roleAction(membershipId: string, formData: FormData) {
  const role = String(formData.get("role") ?? "");
  if (role !== "ADMIN" && role !== "SAFETY_MANAGER" && role !== "WORKER") return;
  try {
    await updateMemberRole(await getActor(), membershipId, role);
  } catch (error) {
    console.error(error);
  }
  revalidatePath("/app/settings");
}

export async function passwordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await changePassword(await getActor(), values(formData, ["currentPassword", "password", "confirmPassword"]));
  } catch (error) {
    return fail(error);
  }
  redirect("/sign-in?revoked=1");
}

export async function revokeSelfAction() {
  const actor = await getActor();
  await revokeSessions(actor, actor.userId);
  redirect("/sign-in?revoked=1");
}

export async function revokeMemberAction(userId: string) {
  await revokeSessions(await getActor(), userId);
  revalidatePath("/app/settings");
}

export async function reviewAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await recordQualifiedReview(await getActor(), values(formData, ["requirementId", "decision", "note", "acknowledgedNotCertification"]));
  } catch (error) {
    return fail(error);
  }
  revalidatePath("/app/regulatory/reviews");
  return {};
}

export async function permitAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await createPermit(await getActor(), values(formData, ["projectId", "authorityName", "jurisdictionLabel", "permitType", "permitNumber", "permitCategory", "status", "appliedOn", "issuedOn", "expiresOn", "closedOn", "notes", "officialUrl", "documentId"]));
  } catch (error) {
    return fail(error);
  }
  revalidatePath("/app/permits");
  return {};
}

export async function heatPlanAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await createHeatPlan(await getActor(), values(formData, ["projectId", "waterProcedure", "shadeProcedure", "highHeatProcedure", "emergencyProcedure", "trainingNote"]));
  } catch (error) {
    return fail(error);
  }
  revalidatePath("/app/heat");
  return {};
}

export async function smokePlanAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await createSmokePlan(await getActor(), values(formData, ["projectId", "manualCheckProcedure", "controlNote", "respiratorNote"]));
  } catch (error) {
    return fail(error);
  }
  revalidatePath("/app/smoke");
  return {};
}

export async function publicWorksAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await createPublicWorksRecord(await getActor(), values(formData, ["projectId", "awardingBody", "registrationEvidenceNote", "registrationDocumentId", "wageDeterminationId", "wageNote", "apprenticeshipCraft", "apprenticeshipNote"]));
  } catch (error) {
    return fail(error);
  }
  revalidatePath("/app/public-works");
  return {};
}

export async function payrollAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await createPayrollDraft(await getActor(), values(formData, ["projectId", "weekEnding", "note"]));
  } catch (error) {
    return fail(error);
  }
  revalidatePath("/app/public-works");
  return {};
}

export async function citySourceAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await createCitySource(await getActor(), values(formData, ["cityName", "countyName", "subject", "officialUrl", "notes", "agencyKind", "contactName", "contactPhone", "contactEmail", "caltransDistrictNote"]));
  } catch (error) {
    return fail(error);
  }
  revalidatePath("/app/jurisdictions");
  return {};
}

export async function localRuleAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await createLocalRule(await getActor(), values(formData, ["projectId", "requirementId", "topic", "ruleText", "citationUrl", "rationale", "reviewStatus", "documentId"]));
  } catch (error) {
    return fail(error);
  }
  revalidatePath("/app/local-rules");
  return {};
}

export async function closeoutAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await saveCloseoutItem(await getActor(), values(formData, ["projectId", "itemKey", "note", "documentId", "signoffName", "acknowledgedNotASignature"]));
  } catch (error) {
    return fail(error);
  }
  revalidatePath("/app/public-works");
  return {};
}

export async function packetAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await createPacket(await getActor(), values(formData, ["projectId", "title", "purposeNote"]));
  } catch (error) {
    return fail(error);
  }
  revalidatePath("/app/packets");
  return {};
}

export async function packetItemAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const item = await addPacketItem(await getActor(), values(formData, ["packetId", "kind", "recordId"]));
    revalidatePath(`/app/packets/${item.packetId}`);
  } catch (error) {
    return fail(error);
  }
  return {};
}

export async function adminPasswordAction(userId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await adminSetPassword(await getActor(), userId, String(formData.get("password") ?? ""));
  } catch (error) {
    return fail(error);
  }
  return {};
}
