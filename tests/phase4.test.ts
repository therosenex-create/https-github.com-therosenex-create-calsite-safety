import { describe, expect, it } from "vitest";
import { prisma } from "../src/lib/db";
import { permitGaps } from "../src/lib/permit-gaps";
import { getCloseout, saveCloseoutItem, createLocalRule } from "../src/lib/services/local";
import { createCitySource, createPermit, getPermit } from "../src/lib/services/records";
import { createCompany, projectInput } from "./helpers";
import { createDocument, createProject } from "../src/lib/services/work";

describe("phase 4 local records", () => {
  it("does not invent an ordinance when a city name is saved", async () => {
    const admin = await createCompany();
    const before = await prisma.regulatoryRequirement.count();
    const source = await createCitySource(admin, {
      cityName: "Oakland",
      countyName: "Alameda",
      subject: "Building counter",
      officialUrl: "",
      notes: "Company contact only. No ordinance text was entered.",
      agencyKind: "CITY",
    });
    expect(source.reviewStatus).toBe("UNREVIEWED");
    expect(source.cityName).toBe("Oakland");
    expect(await prisma.regulatoryRequirement.count()).toBe(before);
    expect(await prisma.regulatorySource.count({ where: { title: { contains: "Oakland" } } })).toBe(0);
  });

  it("keeps permits inside the company and requires evidence before issued or closed", async () => {
    const admin = await createCompany();
    const other = await createCompany("Other Co");
    const project = await createProject(admin, projectInput());
    const permit = await createPermit(admin, {
      projectId: project.id,
      authorityName: "Counter",
      jurisdictionLabel: "Oakland",
      permitType: "Building",
      permitNumber: "",
      status: "DRAFT",
      appliedOn: "",
      notes: "",
      officialUrl: "",
    });
    expect(permit.sourceReviewStatus).toBe("UNREVIEWED");
    expect(permitGaps(permit)).toEqual(expect.arrayContaining(["number", "applied_on", "source_url"]));
    await expect(getPermit(other, permit.id)).rejects.toMatchObject({ code: "not_found" });
    await expect(
      createPermit(admin, {
        projectId: project.id,
        authorityName: "Counter",
        jurisdictionLabel: "Oakland",
        permitType: "Building",
        permitNumber: "B-1",
        status: "ISSUED",
        appliedOn: "2026-11-01",
        issuedOn: "2026-11-02",
        notes: "",
        officialUrl: "",
        documentId: "",
      }),
    ).rejects.toMatchObject({ code: "evidence_required" });
    const issued = await createPermit(admin, {
      projectId: project.id,
      authorityName: "Counter",
      jurisdictionLabel: "Oakland",
      permitType: "Building",
      permitNumber: "B-1",
      status: "ISSUED",
      appliedOn: "2026-11-01",
      issuedOn: "2026-11-02",
      notes: "Company reports the counter issued this. CalSite did not file it.",
      officialUrl: "",
    });
    expect(issued.status).toBe("ISSUED");
    expect(permitGaps(issued)).not.toContain("evidence");
    const foreign = await createDocument(other, { title: "Theirs", category: "permit", description: "", projectId: "" }, {
      name: "theirs.txt",
      mimeType: "text/plain",
      bytes: Buffer.from("nope"),
    });
    await expect(
      createPermit(admin, {
        projectId: project.id,
        authorityName: "Counter",
        jurisdictionLabel: "Oakland",
        permitType: "Building",
        permitNumber: "B-2",
        status: "CLOSED",
        appliedOn: "2026-11-01",
        notes: "",
        officialUrl: "",
        documentId: foreign.id,
      }),
    ).rejects.toMatchObject({ code: "not_found" });
  });

  it("keeps closeout items incomplete until a note and does not forge a signature", async () => {
    const admin = await createCompany();
    const project = await createProject(admin, projectInput());
    const open = await getCloseout(admin, project.id);
    expect(open.find((item) => item.key === "FINAL_PAYROLL")?.complete).toBe(false);
    expect(open.find((item) => item.key === "SIGNOFF")?.complete).toBe(false);
    await expect(
      saveCloseoutItem(admin, {
        projectId: project.id,
        itemKey: "SIGNOFF",
        note: "Ready for our files.",
        documentId: "",
        signoffName: "Ada Admin",
        acknowledgedNotASignature: "",
      }),
    ).rejects.toMatchObject({ code: "acknowledge_required" });
    const saved = await saveCloseoutItem(admin, {
      projectId: project.id,
      itemKey: "FINAL_PAYROLL",
      note: "Final payroll is still a placeholder. Nothing was submitted.",
      documentId: "",
      signoffName: "",
      acknowledgedNotASignature: "",
    });
    expect(saved.recordedAt).toBeInstanceOf(Date);
    const after = await getCloseout(admin, project.id);
    expect(after.find((item) => item.key === "FINAL_PAYROLL")?.complete).toBe(true);
    expect(after.find((item) => item.key === "SIGNOFF")?.complete).toBe(false);
    const drafts = await prisma.certifiedPayrollDraft.findMany({ where: { projectId: project.id } });
    expect(drafts.every((draft) => draft.submittedToAgency === false)).toBe(true);
  });

  it("stores a local rule without adding it to the shared catalog", async () => {
    const admin = await createCompany();
    const before = await prisma.regulatoryRequirement.count();
    const note = await createLocalRule(admin, {
      projectId: "",
      requirementId: "",
      topic: "FIRE_APPROVAL",
      ruleText: "Company pointer to a fire-department condition. No code was copied.",
      citationUrl: "",
      rationale: "",
      reviewStatus: "PENDING_QUALIFIED_REVIEW",
      documentId: "",
    });
    expect(note.reviewStatus).toBe("PENDING_QUALIFIED_REVIEW");
    expect(await prisma.regulatoryRequirement.count()).toBe(before);
    await expect(
      createLocalRule(admin, {
        projectId: "",
        requirementId: "",
        topic: "RIGHT_OF_WAY",
        ruleText: "Encroachment pointer only.",
        citationUrl: "https://example.com/row",
        rationale: "short",
        reviewStatus: "SOURCE_LINKED",
        documentId: "",
      }),
    ).rejects.toMatchObject({ code: "rationale_required" });
  });
});
