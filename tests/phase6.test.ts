import { describe, expect, it } from "vitest";
import { prisma } from "../src/lib/db";
import { acceptContractDraft, createContractDocument, createContractDraft, listContractDocuments, recordAddendumReview } from "../src/lib/services/contracts";
import { createDocument, createProject } from "../src/lib/services/work";
import { addWorker, createCompany, projectInput } from "./helpers";

async function fileFor(actor: Awaited<ReturnType<typeof createCompany>>, projectId: string) {
  return createDocument(
    actor,
    { projectId, title: "Excerpt", category: "other", description: "Typed excerpt" },
    { name: "excerpt.txt", mimeType: "text/plain", bytes: Buffer.from("clause text") },
  );
}

describe("phase 6 contracts", () => {
  it("keeps drafts inactive until a person accepts them and stays inside the company", async () => {
    const admin = await createCompany();
    const other = await createCompany("Other Co");
    const worker = await addWorker(admin);
    const project = await createProject(admin, projectInput());
    const file = await fileFor(admin, project.id);
    const contract = await createContractDocument(admin, {
      projectId: project.id,
      documentId: file.id,
      docType: "SUBCONTRACT",
      title: "Subcontract excerpt",
      parties: "Owner and builder",
      effectiveOn: "",
      receivedOn: "2026-11-01",
      revisionLabel: "A",
      notes: "Company file only.",
    });
    expect(contract.documentId).toBe(file.id);
    const catalogBefore = await prisma.regulatoryRequirement.count();
    const draft = await createContractDraft(admin, {
      contractDocumentId: contract.id,
      clauseReference: "Page 2, paragraph typed by the company",
      quote: "The builder will keep a tailgate record. This sentence was typed, not extracted.",
      requirementId: "",
    });
    expect(draft.status).toBe("DRAFT");
    expect(await prisma.complianceTask.count({ where: { organizationId: admin.organizationId, basis: "CONTRACT_ACCEPTED" } })).toBe(0);
    expect(await prisma.regulatoryRequirement.count()).toBe(catalogBefore);
    await expect(
      acceptContractDraft(worker, { draftId: draft.id, reason: "A worker must not be able to accept this draft.", dueOn: "" }),
    ).rejects.toMatchObject({ code: "forbidden" });
    await expect(listContractDocuments(other).then((rows) => rows.documents.find((row) => row.id === contract.id))).resolves.toBeUndefined();
    const accepted = await acceptContractDraft(admin, {
      draftId: draft.id,
      reason: "Safety manager compared the typed quote with the company file.",
      dueOn: "2026-11-20",
    });
    expect(accepted.status).toBe("ACCEPTED");
    expect(accepted.contractDocument.documentId).toBe(file.id);
    expect(accepted.taskId).toBeTruthy();
    const task = await prisma.complianceTask.findFirstOrThrow({ where: { id: accepted.taskId ?? "" } });
    expect(task.basis).toBe("CONTRACT_ACCEPTED");
    expect(task.basisNote).toContain("typed, not extracted");
    expect(task.projectId).toBe(project.id);
    const note = await prisma.localRuleNote.findFirstOrThrow({ where: { id: accepted.localRuleNoteId ?? "" } });
    expect(note.reviewStatus).toBe("PENDING_QUALIFIED_REVIEW");
    expect(note.documentId).toBe(file.id);
    expect(await prisma.regulatoryRequirement.count()).toBe(catalogBefore);
  });

  it("does not publish a mapped clause into the shared catalog", async () => {
    const admin = await createCompany();
    const project = await createProject(admin, projectInput());
    const file = await fileFor(admin, project.id);
    const stamp = `${Date.now()}`;
    const agency = await prisma.agency.create({
      data: { code: `CAG-${stamp}`, name: "DIR", abbreviation: "DIR", websiteUrl: "https://www.dir.ca.gov/", level: "state" },
    });
    const jurisdiction = await prisma.jurisdiction.create({
      data: { code: `CCA-${stamp}`, name: "California", kind: "state", state: "CA" },
    });
    const source = await prisma.regulatorySource.create({
      data: {
        code: `CSRC-${stamp}`,
        agencyId: agency.id,
        jurisdictionId: jurisdiction.id,
        title: "Catalog row",
        documentKind: "REGULATION",
        subject: "meetings",
        officialUrl: "https://www.dir.ca.gov/title8/1509.html",
        versionLabel: "test",
        geographicArea: "California",
        reliability: "PRIMARY_STATUTE_OR_REGULATION",
        reviewStatus: "SOURCE_LINKED",
        isBinding: true,
        limitations: "Partial.",
        retrievalStatus: "NOT_CONFIGURED",
      },
    });
    const requirement = await prisma.regulatoryRequirement.create({
      data: {
        code: `CREQ-${stamp}`,
        sourceId: source.id,
        title: "Tailgate pointer",
        citation: `8 CCR test ${stamp}`,
        plainLanguageEn: "Stored summary stays put.",
        plainLanguageEs: "El resumen guardado permanece.",
        scope: "Test",
        industry: "Construction",
        activity: "Meetings",
        geographicScope: "California",
        responsibleParty: "Employer",
        deadlineOrTrigger: "Not a date.",
        reviewStatus: "PENDING_QUALIFIED_REVIEW",
        limitations: "Partial.",
        defaultApplicability: "POTENTIALLY_APPLICABLE",
        legalAuthority: "regulation",
      },
    });
    const contract = await createContractDocument(admin, {
      projectId: project.id,
      documentId: file.id,
      docType: "SPECS",
      title: "Spec pointer",
      parties: "Owner and builder",
      effectiveOn: "",
      receivedOn: "",
      revisionLabel: "",
      notes: "",
    });
    const draft = await createContractDraft(admin, {
      contractDocumentId: contract.id,
      clauseReference: "Spec sheet typed reference",
      quote: "Hold a safety meeting when the spec says the company will.",
      requirementId: requirement.id,
    });
    await expect(acceptContractDraft(admin, { draftId: draft.id, reason: "short", dueOn: "" })).rejects.toMatchObject({ code: "too_small" });
    const accepted = await acceptContractDraft(admin, {
      draftId: draft.id,
      reason: "The quote was checked against the uploaded spec excerpt.",
      dueOn: "",
    });
    expect(accepted.localRuleNoteId).toBeNull();
    const row = await prisma.projectRequirement.findFirstOrThrow({
      where: { projectId: project.id, requirementId: requirement.id },
    });
    expect(row.applicability).toBe("CONTRACTUALLY_REQUIRED");
    const after = await prisma.regulatoryRequirement.findUniqueOrThrow({ where: { id: requirement.id } });
    expect(after.plainLanguageEn).toBe("Stored summary stays put.");
    expect(after.reviewStatus).toBe("PENDING_QUALIFIED_REVIEW");
    const outsider = await createCompany("Third");
    const outsiderProject = await createProject(outsider, projectInput());
    const foreign = await fileFor(outsider, outsiderProject.id);
    await expect(
      createContractDocument(admin, {
        projectId: project.id,
        documentId: foreign.id,
        docType: "OTHER",
        title: "Nope",
        parties: "Nobody",
        effectiveOn: "",
        receivedOn: "",
        revisionLabel: "",
        notes: "",
      }),
    ).rejects.toMatchObject({ code: "not_found" });
  });

  it("asks for a human note when an addendum follows an accepted clause and does not rewrite the quote", async () => {
    const admin = await createCompany();
    const project = await createProject(admin, projectInput());
    const file = await fileFor(admin, project.id);
    const contract = await createContractDocument(admin, {
      projectId: project.id,
      documentId: file.id,
      docType: "PRIME",
      title: "Prime excerpt",
      parties: "Owner and builder",
      effectiveOn: "",
      receivedOn: "",
      revisionLabel: "0",
      notes: "",
    });
    const draft = await createContractDraft(admin, {
      contractDocumentId: contract.id,
      clauseReference: "Article 4",
      quote: "Original typed quote that must stay as written.",
      requirementId: "",
    });
    await acceptContractDraft(admin, {
      draftId: draft.id,
      reason: "Accepted after reading the company file.",
      dueOn: "",
    });
    const addendum = await createContractDocument(admin, {
      projectId: project.id,
      documentId: file.id,
      docType: "ADDENDUM",
      title: "Addendum 1",
      parties: "Owner and builder",
      effectiveOn: "",
      receivedOn: "2026-11-02",
      revisionLabel: "1",
      notes: "New paper. Requirements were not rewritten.",
    });
    const listed = await listContractDocuments(admin);
    expect(listed.impact.map((item) => item.contractDocumentId)).toContain(addendum.id);
    const quoteBefore = (await prisma.contractDraft.findUniqueOrThrow({ where: { id: draft.id } })).quote;
    await recordAddendumReview(admin, {
      contractDocumentId: addendum.id,
      note: "Read addendum 1. The accepted quote still stands.",
    });
    const quoteAfter = (await prisma.contractDraft.findUniqueOrThrow({ where: { id: draft.id } })).quote;
    expect(quoteAfter).toBe(quoteBefore);
    const again = await listContractDocuments(admin);
    expect(again.impact.map((item) => item.contractDocumentId)).not.toContain(addendum.id);
  });
});
