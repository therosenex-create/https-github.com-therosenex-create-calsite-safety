import { describe, expect, it } from "vitest";
import { catalogProblems, requirements } from "../prisma/catalog";
import { contentSecurityPolicy } from "../src/lib/security-headers";
import { LOGIN_FAILURE_LIMIT } from "../src/lib/rate-limit";
import { sessionVersionMatches } from "../src/lib/session-version";
import { prisma } from "../src/lib/db";
import { authenticate, recordLicenseCheck, revokeSessions, updateOrganization } from "../src/lib/services/accounts";
import { createCitySource, createPermit, recordQualifiedReview } from "../src/lib/services/records";
import { createDocument } from "../src/lib/services/work";
import { addWorker, createCompany, projectInput } from "./helpers";
import { createProject } from "../src/lib/services/work";

async function catalogRequirement(code: string) {
  const agency = await prisma.agency.create({
    data: { code: `AG-${code}`, name: "DIR", abbreviation: "DIR", websiteUrl: "https://www.dir.ca.gov/", level: "STATE" },
  });
  const jurisdiction = await prisma.jurisdiction.create({
    data: { code: `J-${code}`, name: "California", kind: "STATE", state: "CA" },
  });
  const source = await prisma.regulatorySource.create({
    data: {
      code: `SRC-${code}`,
      agencyId: agency.id,
      jurisdictionId: jurisdiction.id,
      title: code,
      documentKind: "REGULATION",
      subject: "Test",
      officialUrl: "https://www.dir.ca.gov/title8/3203.html",
      versionLabel: "test",
      geographicArea: "California",
      reliability: "PRIMARY_STATUTE_OR_REGULATION",
      reviewStatus: "PENDING_QUALIFIED_REVIEW",
      isBinding: true,
      limitations: "Test copy.",
      retrievalStatus: "FETCHED_PARTIAL",
      automatedRetrievalConfigured: false,
    },
  });
  return prisma.regulatoryRequirement.create({
    data: {
      code,
      sourceId: source.id,
      title: code,
      citation: code,
      plainLanguageEn: "Original summary that a review must not rewrite.",
      plainLanguageEs: "Resumen.",
      scope: "Test scope",
      industry: "Test",
      activity: "Test",
      geographicScope: "California",
      responsibleParty: "Employer",
      deadlineOrTrigger: "Unknown",
      deadlineVerified: false,
      reviewStatus: "PENDING_QUALIFIED_REVIEW",
      limitations: "Partial.",
      defaultApplicability: "POTENTIALLY_APPLICABLE",
      legalAuthority: "Title 8",
    },
  });
}

describe("phase 2 catalog", () => {
  it("keeps new sections partial and grounded", () => {
    expect(catalogProblems()).toEqual([]);
    const roof = requirements.find((item) => item.code === "CCR-T8-1730");
    const protective = requirements.find((item) => item.code === "CCR-T8-1541-1");
    const smoke = requirements.find((item) => item.code === "CCR-T8-5141-1");
    const lead = requirements.find((item) => item.code === "CCR-T8-1532-1");
    expect(roof?.officialExcerpt).toMatch(/20 feet/);
    expect(roof?.plainLanguageEn).toContain("1731");
    expect(protective?.officialExcerpt).toMatch(/less than 5 feet/);
    expect(smoke?.officialExcerpt).toMatch(/151 or greater/);
    expect(lead?.plainLanguageEn).toContain("10 micrograms");
    expect(lead?.plainLanguageEn).toContain("2 micrograms");
    expect(lead?.deadlineVerified).toBe(false);
  });
});

describe("phase 2 workflows", () => {
  it("records a qualified review without changing the catalog text or verifying a license", async () => {
    const admin = await createCompany();
    const worker = await addWorker(admin);
    const requirement = await catalogRequirement("CCR-T8-3203");
    const note = "I opened the DIR convenience copy and the limitations in the catalog still apply to our company.";
    await expect(
      recordQualifiedReview(worker, {
        requirementId: requirement.id,
        decision: "SOURCE_READ_WITH_LIMITATIONS",
        note,
        acknowledgedNotCertification: "yes",
      }),
    ).rejects.toMatchObject({ code: "forbidden" });
    await expect(
      recordQualifiedReview(admin, {
        requirementId: requirement.id,
        decision: "SOURCE_READ_WITH_LIMITATIONS",
        note,
        acknowledgedNotCertification: "no",
      }),
    ).rejects.toMatchObject({ code: "acknowledge_required" });
    const review = await recordQualifiedReview(admin, {
      requirementId: requirement.id,
      decision: "SOURCE_READ_WITH_LIMITATIONS",
      note,
      acknowledgedNotCertification: "yes",
    });
    expect(review.acknowledgedNotCertification).toBe(true);
    const reread = await prisma.regulatoryRequirement.findUniqueOrThrow({ where: { id: requirement.id } });
    expect(reread.plainLanguageEn).toBe(requirement.plainLanguageEn);
    expect(reread.reviewStatus).toBe("PENDING_QUALIFIED_REVIEW");
    await updateOrganization(admin, {
      name: "Test Builders",
      legalName: "",
      dba: "",
      mailingCity: "",
      mailingState: "",
      cslbLicenseNumber: "999999",
      cslbClassification: "",
      dirRegistrationNumber: "",
    });
    const org = await prisma.organization.findUniqueOrThrow({ where: { id: admin.organizationId } });
    expect(org.cslbVerificationStatus).toBe("VERIFICATION_REQUIRED");
  });

  it("stores a dated license note and rejects another company's file", async () => {
    const admin = await createCompany();
    const other = await createCompany("Other Co");
    const document = await createDocument(other, { title: "Their file", category: "other", description: "Private", projectId: "" }, {
      name: "note.txt",
      mimeType: "text/plain",
      bytes: Buffer.from("private"),
    });
    await expect(
      recordLicenseCheck(admin, {
        kind: "CSLB",
        status: "MANUALLY_RECORDED",
        note: "I looked at the public CSLB page today. This is not a live lookup.",
        documentId: document.id,
      }),
    ).rejects.toMatchObject({ code: "not_found" });
    const own = await createDocument(admin, { title: "Our note", category: "other", description: "Ours", projectId: "" }, {
      name: "ours.txt",
      mimeType: "text/plain",
      bytes: Buffer.from("ours"),
    });
    const check = await recordLicenseCheck(admin, {
      kind: "DIR_PWCR",
      status: "VERIFICATION_REQUIRED",
      note: "Registration number was typed from a paper form. DIR was not queried.",
      documentId: own.id,
    });
    expect(check.documentId).toBe(own.id);
    expect(check.checkedAt).toBeInstanceOf(Date);
    const org = await prisma.organization.findUniqueOrThrow({ where: { id: admin.organizationId } });
    expect(org.dirVerificationStatus).toBe("VERIFICATION_REQUIRED");
    expect(org.cslbVerificationStatus).toBe("VERIFICATION_REQUIRED");
  });

  it("keeps permits and city sources empty of extracted requirements", async () => {
    const admin = await createCompany();
    const project = await createProject(admin, projectInput());
    const before = await prisma.regulatoryRequirement.count();
    const permit = await createPermit(admin, {
      projectId: project.id,
      authorityName: "User entered department",
      jurisdictionLabel: "Oakland",
      permitType: "Building",
      permitNumber: "",
      status: "UNKNOWN",
      appliedOn: "",
      notes: "",
      officialUrl: "",
    });
    expect(permit.sourceReviewStatus).toBe("UNREVIEWED");
    expect(permit.officialUrl).toBeNull();
    const city = await createCitySource(admin, {
      cityName: "Oakland",
      countyName: "Alameda",
      subject: "Building department page the user found",
      officialUrl: "https://www.oaklandca.gov/",
      notes: "Entered by the company. No ordinance text was copied into the catalog.",
    });
    expect(city.reviewStatus).toBe("UNREVIEWED");
    expect(await prisma.regulatoryRequirement.count()).toBe(before);
  });

  it("blocks sign-in after repeated failures and revokes session versions", async () => {
    const admin = await createCompany();
    await prisma.loginAttempt.createMany({
      data: Array.from({ length: LOGIN_FAILURE_LIMIT }, () => ({ email: admin.email, success: false })),
    });
    await expect(authenticate(admin.email, "Correct-Horse-1")).rejects.toMatchObject({ code: "rate_limited" });
    expect(sessionVersionMatches(0, 0)).toBe(true);
    await revokeSessions(admin, admin.userId);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: admin.userId } });
    expect(user.sessionVersion).toBe(1);
    expect(sessionVersionMatches(0, user.sessionVersion)).toBe(false);
  });

  it("sends a CSP that blocks framing and plugins", () => {
    expect(contentSecurityPolicy).toContain("frame-ancestors 'none'");
    expect(contentSecurityPolicy).toContain("object-src 'none'");
    expect(contentSecurityPolicy).toContain("form-action 'self'");
  });
});
