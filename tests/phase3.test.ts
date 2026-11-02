import { describe, expect, it } from "vitest";
import { catalogProblems, requirements, sources } from "../prisma/catalog";
import { contentSecurityPolicyFor } from "../src/lib/security-headers";
import { getMailer } from "../src/lib/mailer";
import { getBlobStore, missingObjectStorageEnv } from "../src/lib/storage";
import { prisma } from "../src/lib/db";
import { createHeatPlan, createPayrollDraft, createPublicWorksRecord, createSmokePlan } from "../src/lib/services/field-ops";
import { createCompany, projectInput } from "./helpers";
import { createProject } from "../src/lib/services/work";

describe("phase 3 catalog", () => {
  it("adds readable neighbors and refuses wage rates in plain language", () => {
    expect(catalogProblems()).toEqual([]);
    expect(requirements.find((item) => item.code === "CCR-T8-1731")?.officialExcerpt).toMatch(/6 feet/);
    expect(requirements.find((item) => item.code === "CCR-T8-1510")?.officialExcerpt).toMatch(/first employed/);
    expect(requirements.find((item) => item.code === "CCR-T8-1529")?.officialExcerpt).toMatch(/0\.1 fiber/);
    expect(requirements.find((item) => item.code === "CCR-T8-1541-1-APP-B")?.limitations.toLowerCase()).toContain("not reproduced");
    const registration = requirements.find((item) => item.code === "DIR-PWCR-REGISTRATION");
    expect(registration?.officialExcerpt).toMatch(/\$400/);
    expect(registration?.plainLanguageEn).not.toMatch(/\$\d/);
    expect(sources.find((source) => source.code === "DIR-PW-REGISTRATION")?.isBinding).toBe(false);
  });
});

describe("phase 3 operations", () => {
  it("stores public-works pointers and an unsubmitted payroll draft", async () => {
    const admin = await createCompany();
    const project = await createProject(admin, projectInput({ publicWorksStatus: "PENDING_QUALIFIED_REVIEW", publicWorksRationale: "School owner entered. Coverage is not decided." }));
    const record = await createPublicWorksRecord(admin, {
      projectId: project.id,
      awardingBody: "Demonstration district",
      registrationEvidenceNote: "Looked at the DIR registration webpage. This app did not query DIR.",
      registrationDocumentId: "",
      wageDeterminationId: "USER-POINTER-ONLY",
      wageNote: "No rate was entered. The official PDF is not in the catalog.",
      apprenticeshipCraft: "Carpenter",
      apprenticeshipNote: "Ratio unknown.",
    });
    expect(record.wageDeterminationId).toBe("USER-POINTER-ONLY");
    const draft = await createPayrollDraft(admin, {
      projectId: project.id,
      weekEnding: "2026-11-07",
      note: "Hours were not entered. This draft is not a submission.",
    });
    expect(draft.submittedToAgency).toBe(false);
    const stored = await prisma.certifiedPayrollDraft.findUniqueOrThrow({ where: { id: draft.id } });
    expect(stored.submittedToAgency).toBe(false);
  });

  it("saves heat and smoke plans without calling an outside service", async () => {
    const admin = await createCompany();
    const heat = await createHeatPlan(admin, {
      projectId: "",
      waterProcedure: "Water is at the foreman's truck.",
      shadeProcedure: "Pop-up is on the north side.",
      highHeatProcedure: "Buddy check after lunch when the crew says it feels hotter.",
      emergencyProcedure: "Call 911 and the superintendent.",
      trainingNote: "",
    });
    expect(heat.requirementCode).toBe("CCR-T8-3395");
    const smoke = await createSmokePlan(admin, {
      projectId: "",
      manualCheckProcedure: "The foreman will open AirNow on a phone. This app will not.",
      controlNote: "Move dusty cutting indoors if the crew can.",
      respiratorNote: "N95s are in the gang box. Fit testing is not recorded here.",
    });
    expect(smoke.requirementCode).toBe("CCR-T8-5141-1");
  });

  it("keeps mail unsent and object storage closed", async () => {
    const mail = await getMailer().sendInvitation({ to: "a@example.com", companyName: "Test", inviteeName: "Ada" });
    expect(mail.delivered).toBe(false);
    expect(mail.reason).toMatch(/not set|no sender/i);
    expect(getBlobStore().kind).toBe("database");
    expect(getBlobStore().limit).toBe(8 * 1024 * 1024);
    const previous = process.env.DOCUMENT_STORAGE;
    process.env.DOCUMENT_STORAGE = "object";
    await expect(getBlobStore().put({ organizationId: "x", bytes: Buffer.from("a"), fileName: "a.txt" })).rejects.toMatchObject({ code: "storage_unconfigured" });
    if (previous === undefined) delete process.env.DOCUMENT_STORAGE;
    else process.env.DOCUMENT_STORAGE = previous;
    expect(missingObjectStorageEnv().length).toBeGreaterThan(0);
    const noncePolicy = contentSecurityPolicyFor("abc");
    expect(noncePolicy).toContain("nonce-abc");
    expect(noncePolicy).not.toContain("script-src 'self' 'unsafe-inline'");
  });
});
