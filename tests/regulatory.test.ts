import { describe, expect, it } from "vitest";
import { catalogProblems, requirements } from "../prisma/catalog";
import { summarizeCatalogChange } from "../src/lib/fingerprint";
import { prisma } from "../src/lib/db";
import { flagSourceForManualReview } from "../src/lib/services/regulatory";
import { createCompany } from "./helpers";

describe("regulatory catalog", () => {
  it("keeps every seeded requirement tied to a source and does not invent penalties", () => {
    expect(catalogProblems()).toEqual([]);
    for (const requirement of requirements) {
      expect(requirement.responsibleParty.length).toBeGreaterThan(0);
      expect(requirement.scope.length).toBeGreaterThan(0);
      expect(requirement.deadlineOrTrigger.length).toBeGreaterThan(0);
      expect(requirement.reviewStatus).not.toBe("RETIRED");
    }
    const fall = requirements.find((requirement) => requirement.code === "CCR-T8-1670");
    expect(fall?.limitations.toLowerCase()).toContain("not a universal");
    expect(fall?.deadlineVerified).toBe(true);
    expect(fall?.officialExcerpt).toMatch(/7 1\/2 feet/);
  });

  it("flags a source for review without downloading it", async () => {
    const admin = await createCompany();
    const agency = await prisma.agency.create({
      data: { code: "TEST", name: "Test Agency", abbreviation: "TEST", websiteUrl: "https://example.com", level: "STATE" },
    });
    const jurisdiction = await prisma.jurisdiction.create({
      data: { code: "TEST-CA", name: "California", kind: "STATE", state: "CA" },
    });
    const source = await prisma.regulatorySource.create({
      data: {
        code: "TEST-SOURCE",
        agencyId: agency.id,
        jurisdictionId: jurisdiction.id,
        title: "Test source",
        documentKind: "HOMEPAGE",
        subject: "Test",
        officialUrl: "https://example.com/source",
        versionLabel: "none",
        geographicArea: "California",
        reliability: "OFFICIAL_AGENCY_PUBLICATION",
        reviewStatus: "UNREVIEWED",
        isBinding: false,
        limitations: "Test only.",
        retrievalStatus: "NOT_CONFIGURED",
        automatedRetrievalConfigured: false,
      },
    });
    const change = await flagSourceForManualReview(admin, source.id, "Please have a qualified person read this page.");
    expect(change.retrievalPerformed).toBe(false);
    expect(change.legalEffectiveDate).toBeNull();
    expect(change.summary).toMatch(/No official page was downloaded/);
    expect(summarizeCatalogChange("same", "same")).toMatch(/does not retrieve the official source/);
    expect(summarizeCatalogChange("before", "after")).toMatch(/does not establish that the official regulation changed/);
  });
});
