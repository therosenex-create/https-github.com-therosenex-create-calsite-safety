import { describe, expect, it } from "vitest";
import { AppError } from "../src/lib/errors";
import { prisma } from "../src/lib/db";
import { readElementSnapshot } from "../src/lib/iipp-plan";
import {
  createIippSubmittal,
  getIippVault,
  listIippSubmittals,
  markIippVerified,
  publishIippRevision,
  setIippSubmittalStatus,
  updateIipp,
} from "../src/lib/services/regulatory";
import { createTailgate, listTailgates, projectTailgateStatus } from "../src/lib/services/work";
import { tailgateCadence, workingDaysSince } from "../src/lib/working-days";
import { addWorker, createCompany, projectInput } from "./helpers";
import { createProject } from "../src/lib/services/work";

function pacificToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

const header = {
  title: "Rosenex General Engineering IIPP",
  revisionLabel: "2026-A",
  administratorName: "John Rosen",
  administratorTitle: "Vice President",
  annualReviewOn: "2026-12-15",
};

describe("working-day tailgate cadence", () => {
  it("treats 10 weekdays as on time and the next weekday as review due", () => {
    const start = new Date("2026-11-02T18:00:00.000Z");
    const ten = new Date("2026-11-16T18:00:00.000Z");
    const eleven = new Date("2026-11-17T18:00:00.000Z");
    expect(workingDaysSince(start, start)).toBe(0);
    expect(workingDaysSince(start, ten)).toBe(10);
    expect(workingDaysSince(start, eleven)).toBe(11);
    expect(workingDaysSince(new Date("2026-11-06T18:00:00.000Z"), new Date("2026-11-09T18:00:00.000Z"))).toBe(1);
    expect(tailgateCadence(start, ten)).toBe("ON_TIME");
    expect(tailgateCadence(start, eleven)).toBe("REVIEW_DUE");
    expect(tailgateCadence(null, start)).toBe("REVIEW_DUE");
  });
});

describe("tailgate log", () => {
  it("stores a completed tailgate with typed acknowledgments and an on-time cadence", async () => {
    const admin = await createCompany();
    const other = await createCompany("Other Builders");
    const worker = await addWorker(admin);
    const project = await createProject(admin, projectInput());
    await expect(createTailgate(worker, {})).rejects.toMatchObject({ code: "forbidden" });
    const meeting = await createTailgate(admin, {
      projectId: project.id,
      topicCode: "3395",
      conductedOn: pacificToday(),
      conductorName: "Marcus Vance",
      signatureName: "Marcus Vance",
      roster: "J. Rosen, M. Vance, R. Diaz",
      language: "en",
    });
    expect(meeting.meetingKind).toBe("TAILGATE");
    expect(meeting.status).toBe("COMPLETE");
    expect(meeting.requirementCode).toBe("8 CCR §3395");
    const acknowledgments = await prisma.meetingAcknowledgment.findMany({ where: { meetingId: meeting.id }, orderBy: { roleLabel: "asc" } });
    expect(acknowledgments.map((row) => row.roleLabel).sort()).toEqual(["attendee", "attendee", "attendee", "conductor"]);
    expect(acknowledgments.every((row) => row.method === "typed_name" && row.signedAt)).toBe(true);
    const status = await projectTailgateStatus(admin, project.id);
    expect(status.cadence).toBe("ON_TIME");
    const listed = await listTailgates(admin, { projectId: project.id });
    expect(listed.items[0]?.compliant).toBe(true);
    expect(listed.items[0]?.signedCount).toBe(3);
    const hidden = await listTailgates(other, {});
    expect(hidden.items.find((row) => row.id === meeting.id)).toBeUndefined();
    await expect(projectTailgateStatus(other, project.id)).rejects.toBeInstanceOf(AppError);
  });

  it("marks review due when the last completed tailgate is older than 10 working days", async () => {
    const admin = await createCompany();
    const project = await createProject(admin, projectInput());
    await createTailgate(admin, {
      projectId: project.id,
      topicCode: "1541",
      conductedOn: "2025-06-02",
      conductorName: "Elena Rostova",
      signatureName: "Elena Rostova",
      roster: "A. Crew",
      language: "es",
    });
    const status = await projectTailgateStatus(admin, project.id);
    expect(status.cadence).toBe("REVIEW_DUE");
    expect(status.lastAt).toBeTruthy();
  });
});

describe("IIPP active plan", () => {
  it("records an active revision, marks it verified, and keeps submittals inside the company", async () => {
    const admin = await createCompany();
    const other = await createCompany("Fence Partner");
    const worker = await addWorker(admin);
    const project = await createProject(admin, projectInput());
    await expect(publishIippRevision(admin)).rejects.toMatchObject({ code: "iipp_incomplete" });
    await updateIipp(admin, {
      header,
      claim: "The written program is kept in the office and on the jobsite.",
      procedures: {
        hazard_id: { procedure: "Walk the site each morning and write down new hazards.", responsible: "Superintendent" },
        investigation: { procedure: "The administrator starts the investigation the same day.", responsible: "John Rosen" },
        correction: { procedure: "Correct hazards before the crew goes back to that area.", responsible: "Foreman" },
        training: { procedure: "Tailgate the crew before the task starts.", responsible: "Foreman" },
      },
    });
    await expect(publishIippRevision(worker)).rejects.toMatchObject({ code: "forbidden" });
    const active = await publishIippRevision(admin);
    expect(active.state).toBe("ACTIVE");
    const hazard = readElementSnapshot(active.elementSnapshot).find((element) => element.key === "hazard_id");
    expect(hazard?.userProcedure).toMatch(/Walk the site/);
    const verified = await markIippVerified(admin);
    expect(verified.state).toBe("VERIFIED");
    expect(verified.verifiedAt).toBeTruthy();
    const vault = await getIippVault(admin);
    expect(vault.live?.state).toBe("VERIFIED");
    expect(vault.live?.administratorName).toBe("John Rosen");
    expect(vault.differs).toBe(false);
    const otherVault = await getIippVault(other);
    expect(otherVault.program.organizationId).toBe(other.organizationId);
    expect(otherVault.revisions).toHaveLength(0);

    const submittal = await createIippSubmittal(admin, {
      projectId: project.id,
      companyName: "Pacific Fence Corp",
      note: "Written program received for the fencing scope.",
    });
    expect(submittal.status).toBe("PENDING_REVIEW");
    const approved = await setIippSubmittalStatus(admin, submittal.id, "APPROVED");
    expect(approved.status).toBe("APPROVED");
    expect(approved.reviewedAt).toBeTruthy();
    const rows = await listIippSubmittals(admin, project.id);
    expect(rows.map((row) => row.companyName)).toEqual(["Pacific Fence Corp"]);
    expect(await listIippSubmittals(other, project.id)).toEqual([]);
    await expect(setIippSubmittalStatus(other, submittal.id, "PENDING_REVIEW")).rejects.toMatchObject({ code: "not_found" });

    await updateIipp(admin, {
      header: { ...header, revisionLabel: "2026-B" },
      claim: "The written program is kept in the office and on the jobsite.",
      procedures: {},
    });
    const next = await publishIippRevision(admin);
    expect(next.state).toBe("ACTIVE");
    const history = await prisma.iippRevision.findMany({ where: { programId: vault.program.id }, orderBy: { createdAt: "asc" } });
    expect(history.map((row) => row.state)).toEqual(["SUPERSEDED", "ACTIVE"]);
  });
});
