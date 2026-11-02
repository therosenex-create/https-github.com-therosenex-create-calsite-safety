import { describe, expect, it } from "vitest";
import { prisma } from "../src/lib/db";
import { catalogGuidance, searchCatalog } from "../src/lib/services/regulatory";
import { containsScoreKey, getProjectDashboard } from "../src/lib/services/reporting";
import { addPacketItem, createPacket, getPacketExport } from "../src/lib/services/packets";
import { createIncident, createProject, getIncident } from "../src/lib/services/work";
import { addWorker, createCompany, projectInput } from "./helpers";

describe("phase 5 reporting", () => {
  it("counts project work without a compliance score and stays inside the company", async () => {
    const admin = await createCompany();
    const other = await createCompany("Other Co");
    const project = await createProject(admin, projectInput());
    const dashboard = await getProjectDashboard(admin, project.id);
    expect(containsScoreKey(dashboard)).toBe(false);
    expect(Object.keys(dashboard).sort()).toEqual(
      ["closeoutIncomplete", "openCorrectiveActions", "openIncidents", "pendingApplicability", "permits", "projectId", "projectName", "trainingPointers"].sort(),
    );
    expect(dashboard.openCorrectiveActions.count).toBe(0);
    expect(dashboard.closeoutIncomplete.count).toBe(7);
    await expect(getProjectDashboard(other, project.id)).rejects.toMatchObject({ code: "not_found" });
  });

  it("keeps packets in the company and hides another worker's incident", async () => {
    const admin = await createCompany();
    const other = await createCompany("Other Co");
    const worker = await addWorker(admin);
    const second = await addWorker(admin, `second-${Date.now()}@example.com`);
    const project = await createProject(admin, projectInput());
    const incident = await createIncident(worker, {
      projectId: project.id,
      type: "NEAR_MISS",
      severity: "LOW",
      occurredAt: "2026-11-02T08:15",
      location: "Gate",
      description: "A board slipped.",
      immediateActions: "",
      peopleInvolved: "",
      investigationNotes: "",
      status: "OPEN",
    });
    await expect(getIncident(second, incident.id)).rejects.toMatchObject({ code: "not_found" });
    const packet = await createPacket(admin, {
      projectId: project.id,
      title: "November file",
      purposeNote: "Organizational collection for the jobsite. Not a filing.",
    });
    await addPacketItem(admin, { packetId: packet.id, kind: "INCIDENT", recordId: incident.id });
    await expect(getPacketExport(other, packet.id)).rejects.toMatchObject({ code: "not_found" });
    const hidden = await getPacketExport(second, packet.id);
    expect(hidden.included[0]?.state).toBe("withheld");
    expect(hidden.included[0]?.detail).toBeNull();
    const own = await getPacketExport(worker, packet.id);
    expect(own.included[0]?.state).toBe("included");
    expect(own.included[0]?.detail).toContain("board");
    expect(own.missingKinds).toContain("MEETING");
    expect(own.missingKinds).not.toContain("INCIDENT");
  });

  it("searches stored catalog fields and does not leak another company's note", async () => {
    const admin = await createCompany();
    const other = await createCompany("Other Co");
    const stamp = `${Date.now()}`;
    const agency = await prisma.agency.create({
      data: { code: `AG-${stamp}`, name: "DIR", abbreviation: "DIR", websiteUrl: "https://www.dir.ca.gov/", level: "state" },
    });
    const jurisdiction = await prisma.jurisdiction.create({
      data: { code: `CA-${stamp}`, name: "California", kind: "state", state: "CA" },
    });
    const source = await prisma.regulatorySource.create({
      data: {
        code: `SRC-${stamp}`,
        agencyId: agency.id,
        jurisdictionId: jurisdiction.id,
        title: "Title 8 test source",
        documentKind: "REGULATION",
        subject: "heat",
        officialUrl: "https://www.dir.ca.gov/title8/3395.html",
        versionLabel: "test",
        geographicArea: "California",
        reliability: "PRIMARY_STATUTE_OR_REGULATION",
        reviewStatus: "SOURCE_LINKED",
        isBinding: true,
        limitations: "Partial excerpt only. Penalty text was not copied.",
        retrievalStatus: "NOT_CONFIGURED",
      },
    });
    const requirement = await prisma.regulatoryRequirement.create({
      data: {
        code: `REQ-${stamp}`,
        sourceId: source.id,
        title: "Heat illness prevention pointer",
        citation: `8 CCR §3395 test ${stamp}`,
        plainLanguageEn: "Stored summary for search.",
        plainLanguageEs: "Resumen guardado para búsqueda.",
        scope: "Test",
        industry: "Construction",
        activity: "Outdoor work",
        geographicScope: "California",
        responsibleParty: "Employer",
        deadlineOrTrigger: "Not extracted as a date.",
        reviewStatus: "PENDING_QUALIFIED_REVIEW",
        limitations: "Partial excerpt only. Penalty text was not copied.",
        defaultApplicability: "POTENTIALLY_APPLICABLE",
        legalAuthority: "regulation",
      },
    });
    await prisma.companyRequirement.create({
      data: {
        organizationId: other.organizationId,
        requirementId: requirement.id,
        applicability: "APPLICABLE",
        rationale: "Secret note from the other company.",
      },
    });
    const results = await searchCatalog(admin, { q: stamp, reviewStatus: "PENDING_QUALIFIED_REVIEW", jurisdiction: jurisdiction.code, applicability: "" });
    expect(results).toHaveLength(1);
    expect(results[0]?.officialUrl).toBe("https://www.dir.ca.gov/title8/3395.html");
    expect(results[0]?.companyNote).toBeNull();
    expect(results[0]?.guidance).toEqual(catalogGuidance(requirement));
    expect(results[0]?.guidance.en).not.toMatch(/shall|penalty amount|score/i);
    const filtered = await searchCatalog(other, { q: stamp, applicability: "APPLICABLE" });
    expect(filtered[0]?.companyNote).toBe("Secret note from the other company.");
    const hidden = await searchCatalog(admin, { q: stamp, applicability: "APPLICABLE" });
    expect(hidden).toHaveLength(0);
  });
});
