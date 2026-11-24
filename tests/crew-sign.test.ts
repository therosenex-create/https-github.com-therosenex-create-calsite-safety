import { existsSync, mkdirSync, writeFileSync } from "fs";
import { inflateSync } from "zlib";
import { describe, expect, it } from "vitest";
import { prisma } from "../src/lib/db";
import { sha256 } from "../src/lib/fingerprint";
import { t } from "../src/lib/i18n";
import { verifyChain, type ChainEvent } from "../src/lib/sign/chain";
import { KIOSK_SCREEN_KEYS } from "../src/lib/sign/copy";
import { tailgateAttestation } from "../src/lib/sign/format";
import {
  createSignRequest,
  enrollSigner,
  getKioskView,
  kioskFinish,
  kioskSign,
  kioskStartTailgate,
  ownerSign,
  reviseLockedTailgate,
  rotateKiosk,
} from "../src/lib/services/crew-sign";
import { assignCrew, createEmployee, createProject, createTailgate } from "../src/lib/services/work";
import { pacificTodayInput } from "../src/lib/time";
import { createCompany, projectInput } from "./helpers";

const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
const STROKES = JSON.stringify([[{ x: 2, y: 4 }, { x: 18, y: 20 }, { x: 30, y: 12 }]]);
const ctx = { ip: "203.0.113.10", userAgent: "Mozilla/5.0 Vitest", deviceId: "abc123device" };

function pdfText(bytes: Buffer) {
  const parts = [bytes];
  let cursor = 0;
  while (cursor < bytes.length) {
    const start = bytes.indexOf("stream\n", cursor);
    if (start < 0) break;
    const dataStart = start + "stream\n".length;
    const end = bytes.indexOf("\nendstream", dataStart);
    if (end < 0) break;
    try {
      parts.push(inflateSync(bytes.subarray(dataStart, end)));
    } catch {
      // The stream is not Flate-compressed.
    }
    cursor = end + 10;
  }
  return Buffer.concat(parts)
    .toString("latin1")
    .replace(/<([0-9A-Fa-f]{4,})>/g, (_match, hex: string) => (hex.length % 2 === 0 ? Buffer.from(hex, "hex").toString("latin1") : _match));
}

async function person(admin: Awaited<ReturnType<typeof createCompany>>, firstName: string, lastName: string) {
  const employee = await createEmployee(admin, {
    firstName,
    lastName,
    email: "",
    phone: "",
    jobTitle: "Crew",
    trade: "Labor",
    preferredLanguage: "en",
    hireDate: "",
    status: "ACTIVE",
  });
  return employee;
}

function enrollInput(employeeId: string, printedName: string, pin: string) {
  return {
    employeeId,
    language: "en",
    agreed: "yes",
    printedName,
    pin,
    confirmPin: pin,
    signaturePng: PNG,
    strokes: STROKES,
  };
}

describe("crew sign", () => {
  it("requires that attendee's PIN, locks after five misses, and rejects another person's name", async () => {
    const admin = await createCompany();
    const project = await createProject(admin, projectInput({ code: "ELM" }));
    const foreman = await person(admin, "Ada", "Foreman");
    const crew = await person(admin, "Luz", "Martinez");
    await assignCrew(admin, project.id, foreman.id);
    await assignCrew(admin, project.id, crew.id);
    await enrollSigner(admin, enrollInput(foreman.id, "Ada Foreman", "1111"), ctx);
    await enrollSigner(admin, enrollInput(crew.id, "Luz Martinez", "2222"), ctx);
    const { token } = await rotateKiosk(admin, project.id);
    const meeting = await kioskStartTailgate(
      token,
      {
        employeeId: foreman.id,
        pin: "1111",
        topicCode: "3395",
        points: "Water, shade, and who to tell.",
        hazards: "Heat",
        language: "en",
        conductedOn: "2020-01-01",
      },
      ctx,
    );
    expect(pacificTodayInput(meeting.scheduledAt)).toBe(pacificTodayInput());
    await expect(
      kioskSign(token, { employeeId: crew.id, pin: "1111", attestation: "yes", signaturePng: PNG, strokes: STROKES }, ctx),
    ).rejects.toMatchObject({ code: "pin_invalid" });
    for (let attempt = 0; attempt < 4; attempt += 1) {
      await expect(
        kioskSign(token, { employeeId: crew.id, pin: "9999", attestation: "yes", signaturePng: PNG, strokes: STROKES }, ctx),
      ).rejects.toMatchObject({ code: attempt === 3 ? "pin_locked" : "pin_invalid" });
    }
    await expect(
      kioskSign(token, { employeeId: crew.id, pin: "2222", attestation: "yes", signaturePng: PNG, strokes: STROKES }, ctx),
    ).rejects.toMatchObject({ code: "pin_locked" });
    await prisma.signerCredential.update({ where: { employeeId: crew.id }, data: { lockedUntil: new Date(Date.now() - 1000) } });
    await expect(
      kioskSign(
        token,
        {
          employeeId: crew.id,
          pin: "2222",
          attestation: "yes",
          signaturePng: PNG,
          strokes: STROKES,
          signerName: "Ada Foreman",
          typedName: "Ada Foreman",
        },
        ctx,
      ),
    ).rejects.toMatchObject({ code: "not_your_signature" });
    const signed = await kioskSign(
      token,
      { employeeId: crew.id, pin: "2222", attestation: "yes", signaturePng: PNG, strokes: STROKES },
      ctx,
    );
    expect(signed.signerName).toBe("Luz Martinez");
    expect(signed.method).toBe("pin+drawn");
    expect(await prisma.signatureEvent.count({ where: { employeeId: crew.id, recordType: "TAILGATE" } })).toBe(1);
    await kioskSign(token, { employeeId: foreman.id, pin: "1111", attestation: "yes", signaturePng: PNG, strokes: STROKES }, ctx);
    const finished = await kioskFinish(token, { employeeId: foreman.id, pin: "1111" }, ctx);
    const pdf = await prisma.signedRecordPdf.findFirstOrThrow({ where: { id: finished.pdfId ?? "" } });
    const bytes = Buffer.from(pdf.bytes);
    expect(sha256(bytes)).toBe(pdf.sha256);
    expect(pdf.fileName).toMatch(/^ELM_TG_TAILGATE_\d{4}-\d{2}-\d{2}_ESIGNED_r1\.pdf$/);
    const latin = pdfText(bytes);
    expect(latin).toContain("Luz Martinez");
    expect(latin).toContain("Ada Foreman");
    expect(latin).toContain("Audit certificate");
    expect(latin).toContain(" PT");
    expect(latin).toContain("/Image");
    expect(latin).toContain("content sha256");
    const artifactDir = "/opt/cursor/artifacts";
    if (existsSync(artifactDir)) writeFileSync(`${artifactDir}/sample-tailgate-esigned.pdf`, bytes);
    else {
      mkdirSync("tmp", { recursive: true });
      writeFileSync("tmp/sample-tailgate-esigned.pdf", bytes);
    }

    const before = await prisma.signatureEvent.count({ where: { recordId: meeting.id } });
    const revised = await reviseLockedTailgate(admin, meeting.id, {
      topicCode: "1670",
      points: "Tie off before the edge.",
      hazards: "Open edge",
      language: "en",
    });
    expect(revised.signRevision).toBe(2);
    expect(revised.signLockedAt).toBeNull();
    expect(await prisma.signatureEvent.count({ where: { recordId: meeting.id } })).toBe(before);
    expect(await prisma.signatureVoid.count({ where: { recordId: meeting.id, recordRevision: 1 } })).toBe(before);
    await expect(
      prisma.$executeRawUnsafe(`UPDATE signature_events SET signer_name = 'Tampered' WHERE record_id = '${meeting.id}'`),
    ).rejects.toThrow(/append-only/);
    await expect(prisma.$executeRawUnsafe(`DELETE FROM signature_events WHERE record_id = '${meeting.id}'`)).rejects.toThrow(/append-only/);

    const rows = await prisma.signatureEvent.findMany({ where: { organizationId: admin.organizationId } });
    const chain = rows.map((row) => ({ ...row, signatureImage: Buffer.from(row.signatureImage), strokes: row.strokes }) as ChainEvent);
    expect(verifyChain(chain).ok).toBe(true);
    const tampered = chain.map((event) => ({ ...event }));
    tampered[0] = { ...tampered[0], signerName: "Tampered Name" };
    expect(verifyChain(tampered).ok).toBe(false);

    const exported = await prisma.$queryRaw<Array<{ file_name: string; project_code: string | null }>>`
      SELECT file_name, project_code FROM v_signed_export WHERE project_code = 'ELM'
    `;
    expect(exported[0]?.file_name).toBe(pdf.fileName);

    const first = token;
    const rotated = await rotateKiosk(admin, project.id);
    await expect(getKioskView(first)).rejects.toMatchObject({ code: "token_invalid" });
    await expect(getKioskView(rotated.token)).resolves.toMatchObject({ project: { id: project.id } });
    await expect(createTailgate(admin, {})).rejects.toMatchObject({ code: "use_kiosk" });
  });

  it("lets an owner sign two records in one sitting, each as its own event", async () => {
    const admin = await createCompany();
    const project = await createProject(admin, projectInput({ code: "OWN" }));
    const program = await createSignRequest(admin, {
      recordType: "PROGRAM_ADOPTION",
      title: "IIPP adoption",
      body: "The company adopts this written program revision for the jobsite.",
      language: "en",
      formCode: "PRG",
      projectId: project.id,
      recordId: "",
    });
    const jha = await createSignRequest(admin, {
      recordType: "JHA_SIGNOFF",
      title: "JHA signoff",
      body: "The company accepts this job hazard analysis revision.",
      language: "es",
      formCode: "JHA",
      projectId: project.id,
      recordId: "",
    });
    await expect(
      ownerSign(admin, {
        requestId: program.id,
        password: "Correct-Horse-1",
        intent: "yes",
        typedName: admin.name,
        signerName: "Not Ada",
        signaturePng: PNG,
        strokes: STROKES,
      }, ctx),
    ).rejects.toMatchObject({ code: "not_your_signature" });
    const first = await ownerSign(admin, {
      requestId: program.id,
      password: "Correct-Horse-1",
      intent: "yes",
      typedName: admin.name,
      signaturePng: PNG,
      strokes: STROKES,
    }, ctx);
    const second = await ownerSign(admin, {
      requestId: jha.id,
      password: "Correct-Horse-1",
      intent: "yes",
      typedName: admin.name,
      signaturePng: PNG,
      strokes: STROKES,
    }, ctx);
    expect(first.eventId).not.toBe(second.eventId);
    const events = await prisma.signatureEvent.findMany({ where: { organizationId: admin.organizationId, method: "password+drawn" } });
    expect(events).toHaveLength(2);
    expect(new Set(events.map((event) => event.eventHash)).size).toBe(2);
    expect(events.every((event) => event.signerName === "Ada Admin")).toBe(true);
  });

  it("has English and Spanish copy for every kiosk screen", () => {
    for (const key of KIOSK_SCREEN_KEYS) {
      const english = t("en", key);
      const spanish = t("es", key);
      expect(english.length).toBeGreaterThan(3);
      expect(spanish.length).toBeGreaterThan(3);
      expect(spanish).not.toBe(english);
    }
    expect(tailgateAttestation("en", "2026-11-24")).toBe("I attended this meeting on 2026-11-24 and understood the topics.");
    expect(tailgateAttestation("es", "2026-11-24")).not.toBe(tailgateAttestation("en", "2026-11-24"));
  });
});
