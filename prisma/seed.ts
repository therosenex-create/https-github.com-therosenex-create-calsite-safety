import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { agencies, jurisdictions, requirements, REVIEWED_ON, sources } from "./catalog";
import { IIPP_ELEMENTS } from "../src/lib/iipp-template";
import { sha256 } from "../src/lib/fingerprint";

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO_SEED !== "true") {
    throw new Error("Refusing to seed demonstration data while NODE_ENV is production.");
  }
  const demoPassword = process.env.DEMO_PASSWORD;
  if (!demoPassword || demoPassword.length < 10) {
    throw new Error("Set DEMO_PASSWORD to at least 10 characters before seeding.");
  }

  const agencyIds = new Map<string, string>();
  for (const agency of agencies) {
    const row = await prisma.agency.upsert({
      where: { code: agency.code },
      update: { name: agency.name, abbreviation: agency.abbreviation, websiteUrl: agency.websiteUrl, level: agency.level },
      create: agency,
    });
    agencyIds.set(agency.code, row.id);
  }

  const jurisdictionIds = new Map<string, string>();
  for (const jurisdiction of jurisdictions) {
    const row = await prisma.jurisdiction.upsert({
      where: { code: jurisdiction.code },
      update: { name: jurisdiction.name, kind: jurisdiction.kind, state: jurisdiction.state },
      create: jurisdiction,
    });
    jurisdictionIds.set(jurisdiction.code, row.id);
  }

  const sourceIds = new Map<string, string>();
  for (const source of sources) {
    const data = {
      agencyId: agencyIds.get(source.agencyCode)!,
      jurisdictionId: jurisdictionIds.get(source.jurisdictionCode)!,
      title: source.title,
      documentKind: source.documentKind,
      subject: source.subject,
      officialUrl: source.officialUrl,
      versionLabel: "2026-11-02 catalog entry",
      geographicArea: source.jurisdictionCode === "US" ? "United States" : "California",
      reliability: source.reliability,
      reviewStatus: source.reviewStatus,
      isBinding: source.isBinding,
      limitations: source.limitations,
      retrievalStatus: source.retrievalStatus,
      retrievedAt: REVIEWED_ON,
      automatedRetrievalConfigured: false,
      contentFingerprint: null,
      fingerprintScope: source.retrievalStatus === "FETCHED_PARTIAL" ? "partial_review_notes" : "none",
    };
    const row = await prisma.regulatorySource.upsert({
      where: { code: source.code },
      update: data,
      create: { code: source.code, ...data },
    });
    sourceIds.set(source.code, row.id);
    await prisma.regulatoryVersion.deleteMany({ where: { sourceId: row.id } });
    await prisma.regulatoryVersion.create({
      data: {
        sourceId: row.id,
        versionLabel: "2026-11-02",
        retrievedAt: REVIEWED_ON,
        fingerprint: sha256(source.limitations),
        fingerprintScope: "catalog_note_not_official_document",
        notes:
          source.retrievalStatus === "BLOCKED"
            ? "Retrieval was blocked. No official text was stored."
            : "Fingerprint covers the catalog note only. It is not a fingerprint of the official document.",
      },
    });
  }

  for (const requirement of requirements) {
    const sourceId = sourceIds.get(requirement.sourceCode);
    if (!sourceId) throw new Error(`Missing source ${requirement.sourceCode}`);
    const saved = await prisma.regulatoryRequirement.upsert({
      where: { code: requirement.code },
      update: {
        sourceId,
        title: requirement.title,
        citation: requirement.citation,
        plainLanguageEn: requirement.plainLanguageEn,
        plainLanguageEs: requirement.plainLanguageEs,
        officialExcerpt: requirement.officialExcerpt,
        excerptIsPartial: true,
        scope: requirement.scope,
        industry: requirement.industry,
        activity: requirement.activity,
        geographicScope: requirement.geographicScope,
        responsibleParty: requirement.responsibleParty,
        deadlineOrTrigger: requirement.deadlineOrTrigger,
        deadlineVerified: requirement.deadlineVerified,
        recurrence: requirement.recurrence,
        consequencesNote: null,
        reviewStatus: requirement.reviewStatus,
        limitations: requirement.limitations,
        lastVerifiedAt: requirement.reviewStatus === "UNREVIEWED" ? null : REVIEWED_ON,
        defaultApplicability: "POTENTIALLY_APPLICABLE",
        legalAuthority: requirement.legalAuthority,
      },
      create: {
        code: requirement.code,
        sourceId,
        title: requirement.title,
        citation: requirement.citation,
        plainLanguageEn: requirement.plainLanguageEn,
        plainLanguageEs: requirement.plainLanguageEs,
        officialExcerpt: requirement.officialExcerpt,
        excerptIsPartial: true,
        scope: requirement.scope,
        industry: requirement.industry,
        activity: requirement.activity,
        geographicScope: requirement.geographicScope,
        responsibleParty: requirement.responsibleParty,
        deadlineOrTrigger: requirement.deadlineOrTrigger,
        deadlineVerified: requirement.deadlineVerified,
        recurrence: requirement.recurrence,
        consequencesNote: null,
        reviewStatus: requirement.reviewStatus,
        limitations: requirement.limitations,
        lastVerifiedAt: requirement.reviewStatus === "UNREVIEWED" ? null : REVIEWED_ON,
        defaultApplicability: "POTENTIALLY_APPLICABLE",
        legalAuthority: requirement.legalAuthority,
      },
    });
    await prisma.requirementTrigger.deleteMany({ where: { requirementId: saved.id } });
    await prisma.requirementException.deleteMany({ where: { requirementId: saved.id } });
    await prisma.requirementEvidenceType.deleteMany({ where: { requirementId: saved.id } });
    await prisma.requirementApplicabilityRule.deleteMany({ where: { requirementId: saved.id } });
    if (requirement.triggers.length) {
      await prisma.requirementTrigger.createMany({
        data: requirement.triggers.map((trigger) => ({ requirementId: saved.id, ...trigger })),
      });
    }
    if (requirement.exceptions.length) {
      await prisma.requirementException.createMany({
        data: requirement.exceptions.map((exception) => ({ requirementId: saved.id, ...exception })),
      });
    }
    if (requirement.evidence.length) {
      await prisma.requirementEvidenceType.createMany({
        data: requirement.evidence.map((evidence) => ({ requirementId: saved.id, ...evidence })),
      });
    }
    if (requirement.rules.length) {
      await prisma.requirementApplicabilityRule.createMany({
        data: requirement.rules.map((rule) => ({ requirementId: saved.id, ...rule })),
      });
    }
  }

  const passwordHash = await hash(demoPassword, 12);
  const organization = await prisma.organization.upsert({
    where: { slug: "pacific-ridge-demo" },
    update: { name: "Pacific Ridge Builders", isDemonstration: true },
    create: {
      name: "Pacific Ridge Builders",
      legalName: "Pacific Ridge Builders, Inc.",
      dba: "Pacific Ridge",
      slug: "pacific-ridge-demo",
      isDemonstration: true,
      cslbLicenseNumber: "000000",
      cslbClassification: "Entered for the demo only. Not a real classification.",
      cslbVerificationStatus: "VERIFICATION_REQUIRED",
      dirVerificationStatus: "VERIFICATION_REQUIRED",
      mailingCity: "Oakland",
      mailingState: "CA",
    },
  });
  if (!organization.isDemonstration) {
    throw new Error("Refusing to attach demonstration records to a non-demo company.");
  }

  const people = [
    ["demo.admin@calsite.example", "Amina Rahman", "ADMIN"],
    ["demo.safety@calsite.example", "Chris Ortega", "SAFETY_MANAGER"],
    ["demo.worker@calsite.example", "Luz Martinez", "WORKER"],
  ] as const;
  for (const [email, name, role] of people) {
    const user = await prisma.user.upsert({
      where: { email },
      update: { name, passwordHash },
      create: { email, name, passwordHash },
    });
    await prisma.membership.upsert({
      where: { userId_organizationId: { userId: user.id, organizationId: organization.id } },
      update: { role },
      create: { userId: user.id, organizationId: organization.id, role },
    });
  }

  const program = await prisma.iippProgram.upsert({
    where: { organizationId: organization.id },
    update: {},
    create: { organizationId: organization.id, status: "TEMPLATE" },
  });
  for (const element of IIPP_ELEMENTS) {
    await prisma.iippElement.upsert({
      where: { programId_key: { programId: program.id, key: element.key } },
      update: { titleEn: element.titleEn, titleEs: element.titleEs, citation: element.citation, sortOrder: element.sortOrder },
      create: { programId: program.id, ...element },
    });
  }

  const remodel = await prisma.project.upsert({
    where: { id: "demo-remodel" },
    update: {},
    create: {
      id: "demo-remodel",
      organizationId: organization.id,
      name: "Elm Street Kitchen Remodel",
      streetAddress: "418 Elm Street",
      city: "Oakland",
      county: "Alameda",
      state: "CA",
      postalCode: "94607",
      jurisdictionConfirmed: true,
      ownerType: "HOMEOWNER",
      ownerName: "Demonstration homeowner",
      publicWorksStatus: "NOT_APPLICABLE",
      publicWorksRationale: "Demonstration entry: the user described a homeowner kitchen remodel. This is not a legal determination.",
      scopeOfWork: "Interior kitchen remodel. Demonstration scope only.",
      status: "ACTIVE",
      startDate: new Date("2026-10-06T00:00:00.000Z"),
    },
  });

  await prisma.project.upsert({
    where: { id: "demo-school" },
    update: {},
    create: {
      id: "demo-school",
      organizationId: organization.id,
      name: "Harbor Middle School Window Replacement",
      streetAddress: "90 Harbor Avenue",
      city: "Richmond",
      county: "Contra Costa",
      state: "CA",
      jurisdictionConfirmed: false,
      ownerType: "SCHOOL_OR_COLLEGE",
      ownerName: "Demonstration school district",
      publicWorksStatus: "PENDING_QUALIFIED_REVIEW",
      publicWorksRationale: "A school owner was entered. Public-works coverage has not been determined.",
      scopeOfWork: "Window replacement at an occupied campus. Demonstration scope only.",
      status: "PLANNED",
    },
  });

  const employees = [
    { id: "demo-luz", firstName: "Luz", lastName: "Martinez", email: "demo.worker@calsite.example", trade: "Carpenter", preferredLanguage: "es", jobTitle: "Carpenter" },
    { id: "demo-andre", firstName: "Andre", lastName: "Blake", email: "demo.safety@calsite.example", trade: "Supervision", preferredLanguage: "en", jobTitle: "Foreman" },
    { id: "demo-sofia", firstName: "Sofia", lastName: "Nguyen", email: null, trade: "Laborer", preferredLanguage: "es", jobTitle: "Laborer" },
  ];
  for (const employee of employees) {
    await prisma.employee.upsert({
      where: { id: employee.id },
      update: {},
      create: { organizationId: organization.id, status: "ACTIVE", ...employee },
    });
    await prisma.projectAssignment.upsert({
      where: { projectId_employeeId: { projectId: remodel.id, employeeId: employee.id } },
      update: {},
      create: { organizationId: organization.id, projectId: remodel.id, employeeId: employee.id },
    });
  }

  const admin = await prisma.user.findUniqueOrThrow({ where: { email: "demo.admin@calsite.example" } });
  await prisma.safetyMeeting.upsert({
    where: { id: "demo-tailgate" },
    update: {},
    create: {
      id: "demo-tailgate",
      organizationId: organization.id,
      projectId: remodel.id,
      createdById: admin.id,
      title: "Tailgate — drinking water and shade",
      topic: "Outdoor heat illness prevention",
      language: "es",
      scheduledAt: new Date("2026-10-20T15:00:00.000Z"),
      leaderName: "Andre Blake",
      policyBasis: "RECORDED_AGAINST_CITATION",
      requirementCode: "CCR-T8-3395",
      discussionPoints: "Where the water is. Where the shade is. Who to tell if someone feels ill. Demonstration notes only.",
      status: "COMPLETE",
    },
  });
  for (const employee of employees) {
    await prisma.meetingAttendance.upsert({
      where: { meetingId_employeeId: { meetingId: "demo-tailgate", employeeId: employee.id } },
      update: {},
      create: {
        organizationId: organization.id,
        meetingId: "demo-tailgate",
        employeeId: employee.id,
        present: true,
        acknowledgedAt: new Date("2026-10-20T15:20:00.000Z"),
        method: "onscreen_checkbox",
      },
    });
  }

  await prisma.trainingRecord.upsert({
    where: { id: "demo-training" },
    update: {},
    create: {
      id: "demo-training",
      organizationId: organization.id,
      employeeId: "demo-luz",
      projectId: remodel.id,
      createdById: admin.id,
      topic: "Heat illness orientation",
      provider: "Company orientation (demonstration)",
      completedOn: new Date("2026-10-06T00:00:00.000Z"),
      evidenceNote: "Demonstration record. No expiration is stored because none was verified.",
    },
  });

  await prisma.inspection.upsert({
    where: { id: "demo-inspection" },
    update: {},
    create: {
      id: "demo-inspection",
      organizationId: organization.id,
      projectId: remodel.id,
      createdById: admin.id,
      category: "housekeeping",
      inspectedAt: new Date("2026-10-21T17:00:00.000Z"),
      inspectorName: "Chris Ortega",
      location: "Kitchen, first floor",
      summary: "Demonstration inspection. Scrap lumber with nails was in the walkway.",
      status: "OPEN",
      checklist: [],
    },
  });
  await prisma.finding.upsert({
    where: { id: "demo-finding" },
    update: {},
    create: {
      id: "demo-finding",
      organizationId: organization.id,
      inspectionId: "demo-inspection",
      description: "Protruding nails on scrap lumber in the walkway.",
      severity: "MEDIUM",
      immediateAction: "Moved the scrap out of the walkway during the inspection.",
      status: "OPEN",
    },
  });
  await prisma.correctiveAction.upsert({
    where: { id: "demo-action" },
    update: {},
    create: {
      id: "demo-action",
      organizationId: organization.id,
      findingId: "demo-finding",
      description: "Remove or bend the nails and haul the scrap.",
      responsibleName: "Andre Blake",
      dueDate: new Date("2026-10-22T00:00:00.000Z"),
      status: "OPEN",
    },
  });

  await prisma.incidentReport.upsert({
    where: { id: "demo-incident" },
    update: {},
    create: {
      id: "demo-incident",
      organizationId: organization.id,
      projectId: remodel.id,
      createdById: admin.id,
      type: "NEAR_MISS",
      severity: "LOW",
      occurredAt: new Date("2026-10-18T19:00:00.000Z"),
      location: "Kitchen doorway",
      description: "Demonstration near miss: a loose board slipped and nobody was hurt.",
      immediateActions: "Board was removed from the doorway.",
      status: "OPEN",
    },
  });

  const demoFile = Buffer.from("Demonstration document. Not a code of safe practices.\n");
  await prisma.safetyDocument.upsert({
    where: { id: "demo-doc" },
    update: {},
    create: {
      id: "demo-doc",
      organizationId: organization.id,
      projectId: remodel.id,
      createdById: admin.id,
      title: "Demonstration code of safe practices note",
      category: "code_of_safe_practices",
      description: "Placeholder file. Replace it with the company's actual code.",
      fileName: "demonstration.txt",
      mimeType: "text/plain",
      byteSize: demoFile.byteLength,
      sha256: sha256(demoFile),
      contentBytes: demoFile,
    },
  });

  const tailgate = await prisma.regulatoryRequirement.findUnique({ where: { code: "CCR-T8-1509-TAILGATE" } });
  if (tailgate) {
    await prisma.companyRequirement.upsert({
      where: { organizationId_requirementId: { organizationId: organization.id, requirementId: tailgate.id } },
      update: {},
      create: {
        organizationId: organization.id,
        requirementId: tailgate.id,
        applicability: "POTENTIALLY_APPLICABLE",
        rationale: "Demonstration company performs construction work in California. Applicability still needs qualified review.",
        responsibleRole: "Foreman",
      },
    });
  }

  await prisma.citySource.upsert({
    where: { id: "demo-city-source" },
    update: {},
    create: {
      id: "demo-city-source",
      organizationId: organization.id,
      cityName: "Oakland",
      countyName: "Alameda",
      subject: "Demonstration building counter contact",
      agencyKind: "CITY",
      contactName: "Demonstration counter",
      notes: "Demonstration record only. No Oakland ordinance was loaded or copied.",
      reviewStatus: "UNREVIEWED",
      createdById: admin.id,
    },
  });
  await prisma.permitRecord.upsert({
    where: { id: "demo-permit" },
    update: {},
    create: {
      id: "demo-permit",
      organizationId: organization.id,
      projectId: remodel.id,
      authorityName: "Demonstration building counter",
      jurisdictionLabel: "Oakland",
      permitType: "Building permit pointer",
      permitCategory: "building",
      permitNumber: null,
      status: "DRAFT",
      notes: "Demonstration record. Not filed with any agency.",
      sourceReviewStatus: "UNREVIEWED",
      createdById: admin.id,
    },
  });

  await prisma.evidencePacket.upsert({
    where: { id: "demo-packet" },
    update: {},
    create: {
      id: "demo-packet",
      organizationId: organization.id,
      projectId: remodel.id,
      title: "Demonstration evidence packet",
      purposeNote: "Demonstration organizational record. Not a filing and not a certification.",
      createdById: admin.id,
      items: {
        create: {
          id: "demo-packet-item",
          organizationId: organization.id,
          kind: "MEETING",
          recordId: "demo-tailgate",
          sortOrder: 1,
          label: "Tailgate — drinking water and shade",
        },
      },
    },
  });

  console.log("Seeded catalog and Pacific Ridge Builders demonstration company.");
  console.log("Demo emails: demo.admin@calsite.example, demo.safety@calsite.example, demo.worker@calsite.example");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
