import { describe, expect, it } from "vitest";
import { AppError } from "../src/lib/errors";
import { prisma } from "../src/lib/db";
import { authenticate, updateOrganization } from "../src/lib/services/accounts";
import {
  acknowledgeOwnAttendance,
  addCorrectiveAction,
  addFinding,
  createDocument,
  createEmployee,
  createIncident,
  createInspection,
  createMeeting,
  createProject,
  getIncident,
  getProject,
  setAttendance,
  setFindingStatus,
} from "../src/lib/services/work";
import { addWorker, createCompany, projectInput } from "./helpers";

describe("auth and tenancy", () => {
  it("registers a company admin and rejects a bad password", async () => {
    const admin = await createCompany();
    const user = await prisma.user.findUniqueOrThrow({ where: { id: admin.userId } });
    expect(user.passwordHash).not.toContain("Correct-Horse-1");
    expect(await authenticate(admin.email, "Correct-Horse-1")).toMatchObject({ id: admin.userId });
    expect(await authenticate(admin.email, "wrong-password-1")).toBeNull();
    const org = await prisma.organization.findUniqueOrThrow({ where: { id: admin.organizationId } });
    expect(org.cslbVerificationStatus).toBe("VERIFICATION_REQUIRED");
  });

  it("does not treat a typed license number as verified", async () => {
    const admin = await createCompany();
    await updateOrganization(admin, {
      name: "Test Builders",
      legalName: "",
      dba: "",
      mailingCity: "Oakland",
      mailingState: "CA",
      cslbLicenseNumber: "123456",
      cslbClassification: "B",
      dirRegistrationNumber: "PW-1",
    });
    const org = await prisma.organization.findUniqueOrThrow({ where: { id: admin.organizationId } });
    expect(org.cslbLicenseNumber).toBe("123456");
    expect(org.cslbVerificationStatus).toBe("VERIFICATION_REQUIRED");
    expect(org.dirVerificationStatus).toBe("VERIFICATION_REQUIRED");
  });

  it("lets an admin create a project and blocks another company and a worker", async () => {
    const admin = await createCompany();
    const other = await createCompany("Other Builders");
    const worker = await addWorker(admin);
    const project = await createProject(admin, projectInput());
    expect(project.city).toBe("San Francisco");
    expect(project.jurisdictionConfirmed).toBe(false);
    await expect(getProject(other, project.id)).rejects.toBeInstanceOf(AppError);
    await expect(createProject(worker, projectInput({ name: "Nope" }))).rejects.toMatchObject({ code: "forbidden" });
    await expect(
      createProject(admin, projectInput({ publicWorksStatus: "APPLICABLE", publicWorksRationale: "too short" })),
    ).rejects.toMatchObject({ code: "rationale_required" });
  });
});

describe("inspections and meetings", () => {
  it("creates an inspection, finding, and corrective action with a user-entered task", async () => {
    const admin = await createCompany();
    const project = await createProject(admin, projectInput());
    const inspection = await createInspection(admin, {
      projectId: project.id,
      category: "housekeeping",
      inspectedAt: "2026-11-02T09:30",
      inspectorName: "Chris Ortega",
      location: "Lobby",
      summary: "Walkway check",
      status: "OPEN",
    });
    const finding = await addFinding(admin, inspection.id, {
      description: "Nails in the walkway",
      severity: "MEDIUM",
      immediateAction: "Blocked the area",
    });
    await expect(setFindingStatus(admin, finding.id, "CORRECTED")).rejects.toMatchObject({ code: "open_actions" });
    const action = await addCorrectiveAction(admin, finding.id, {
      description: "Remove the nails",
      responsibleName: "Foreman",
      dueDate: "2026-11-03",
      evidenceNote: "",
      status: "OPEN",
    });
    const task = await prisma.complianceTask.findFirstOrThrow({ where: { correctiveActionId: action.id } });
    expect(task.basis).toBe("USER_ENTERED");
    expect(task.basisNote).toMatch(/not calculated from a statute/i);
    await expect(
      addCorrectiveAction(admin, finding.id, {
        description: "Close without proof",
        responsibleName: "Foreman",
        dueDate: "",
        evidenceNote: "short",
        status: "COMPLETE",
      }),
    ).rejects.toMatchObject({ code: "evidence_required" });
  });

  it("creates a tailgate and records attendance", async () => {
    const admin = await createCompany();
    const workerEmail = `luz-${Date.now()}@example.com`;
    const worker = await addWorker(admin, workerEmail);
    const employee = await createEmployee(admin, {
      firstName: "Luz",
      lastName: "Martinez",
      email: workerEmail,
      phone: "510-555-0100",
      jobTitle: "Carpenter",
      trade: "Carpentry",
      preferredLanguage: "es",
      hireDate: "2026-01-15",
      status: "ACTIVE",
    });
    const project = await createProject(admin, projectInput());
    const meeting = await createMeeting(admin, {
      projectId: project.id,
      title: "Tailgate — shade and water",
      topic: "Heat",
      language: "es",
      scheduledAt: "2026-11-02T07:00",
      leaderName: "Andre Blake",
      policyBasis: "COMPANY_POLICY",
      requirementCode: "",
      discussionPoints: "Where the water is.",
      workerQuestions: "",
      followUp: "Refill the jug before lunch",
      notes: "",
      status: "SCHEDULED",
    });
    await setAttendance(admin, meeting.id, [employee.id]);
    await acknowledgeOwnAttendance(worker, meeting.id);
    const rows = await prisma.meetingAttendance.findMany({ where: { meetingId: meeting.id } });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.method).toBe("onscreen_checkbox");
    const followUp = await prisma.complianceTask.findFirst({ where: { organizationId: admin.organizationId, title: { contains: "Refill" } } });
    expect(followUp?.basis).toBe("USER_ENTERED");
    const hidden = await createEmployee(admin, {
      firstName: "Other",
      lastName: "Person",
      email: "other@example.com",
      phone: "510-555-0199",
      jobTitle: "",
      trade: "",
      preferredLanguage: "en",
      hireDate: "",
      status: "ACTIVE",
    });
    const { listEmployees } = await import("../src/lib/services/work");
    const directory = await listEmployees(worker);
    const other = directory.items.find((person) => person.id === hidden.id);
    expect(other?.phone).toBeNull();
  });

  it("hides another worker's incident and investigation notes", async () => {
    const admin = await createCompany();
    const worker = await addWorker(admin);
    const incident = await createIncident(worker, {
      projectId: "",
      type: "NEAR_MISS",
      severity: "LOW",
      occurredAt: "2026-11-02T08:15",
      location: "Gate",
      description: "A board slipped. Nobody was hurt.",
      immediateActions: "Moved the board.",
      peopleInvolved: "",
      investigationNotes: "This should not be stored for a worker.",
      status: "OPEN",
    });
    const own = await getIncident(worker, incident.id);
    expect(own.investigationNotes).toBeNull();
    const other = await addWorker(admin, `second-${Date.now()}@example.com`);
    await expect(getIncident(other, incident.id)).rejects.toMatchObject({ code: "not_found" });
    const managerView = await getIncident(admin, incident.id);
    expect(managerView.investigationNotes).toBeNull();
  });

  it("rejects a document that is not an allowed type", async () => {
    const admin = await createCompany();
    await expect(
      createDocument(admin, { projectId: "", title: "Notes", category: "other", description: "" }, {
        name: "virus.exe",
        mimeType: "application/x-msdownload",
        bytes: Buffer.from("nope"),
      }),
    ).rejects.toMatchObject({ code: "file_type" });
  });
});
