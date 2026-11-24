import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage, type PDFImage } from "pdf-lib";
import { methodLabel, pacificStamp, utcStamp } from "./format";

export type PdfSignature = {
  name: string;
  role: string;
  companyName?: string | null;
  png: Uint8Array;
  signedAt: Date;
  late: boolean;
  flagged: boolean;
  method: string;
};

export type PdfAudit = {
  signerName: string;
  roleLabel: string;
  method: string;
  signedAt: Date;
  ip: string | null;
  userAgent: string | null;
  deviceId: string | null;
  consentVersion: string | null;
  recordHash: string;
  eventHash: string;
  late: boolean;
};

export type SignedPdfInput = {
  title: string;
  lines: string[];
  sections: { heading: string; body: string }[];
  signatures: PdfSignature[];
  audits: PdfAudit[];
  footer: string;
};

function pdfSafe(value: string) {
  return value
    .replaceAll("\u2014", "-")
    .replaceAll("\u2013", "-")
    .replaceAll("\u2018", "'")
    .replaceAll("\u2019", "'")
    .replaceAll("\u201c", '"')
    .replaceAll("\u201d", '"')
    .replaceAll("\u2026", "...")
    .replaceAll("§", "Sec.");
}

export async function buildSignedPdf(input: SignedPdfInput) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const images: PDFImage[] = [];
  for (const signature of input.signatures) {
    images.push(await doc.embedPng(signature.png));
  }
  const cursor = { page: doc.addPage([612, 792]), y: 750 };
  const draw = (text: string, size: number, face: PDFFont = font) => {
    const line = pdfSafe(text).slice(0, 500);
    const width = 516;
    const words = line.split(/\s+/);
    let current = "";
    const lines: string[] = [];
    for (const word of words) {
      const next = current ? `${current} ${word}` : word;
      if (face.widthOfTextAtSize(next, size) > width && current) {
        lines.push(current);
        current = word;
      } else {
        current = next;
      }
    }
    if (current) lines.push(current);
    if (lines.length === 0) lines.push("");
    for (const row of lines) {
      if (cursor.y < 64) cursor.page = addPage(doc, cursor);
      const printable = row.replace(/[^\x20-\x7E]/g, "?");
      cursor.page.drawText(printable, { x: 48, y: cursor.y, size, font: face, color: rgb(0.08, 0.12, 0.2) });
      cursor.y -= size + 4;
    }
  };

  draw(input.title, 16, bold);
  cursor.y -= 4;
  for (const line of input.lines) draw(line, 11);
  for (const section of input.sections) {
    cursor.y -= 8;
    draw(section.heading, 13, bold);
    for (const paragraph of section.body.split("\n")) draw(paragraph || " ", 11);
  }
  cursor.y -= 8;
  draw("Roster", 13, bold);
  input.signatures.forEach((signature, index) => {
    if (cursor.y < 120) cursor.page = addPage(doc, cursor);
    const image = images[index];
    const scale = Math.min(140 / image.width, 48 / image.height, 1);
    cursor.page.drawImage(image, { x: 48, y: cursor.y - 48, width: image.width * scale, height: image.height * scale });
    const late = signature.late ? " signed late" : "";
    const flag = signature.flagged ? " flagged visitor/sub" : "";
    const company = signature.companyName ? ` (${signature.companyName})` : "";
    drawAt(cursor.page, font, `${signature.name}${company}`, 200, cursor.y - 14, 11);
    drawAt(cursor.page, font, `${signature.role} | ${methodLabel(signature.method)} | ${pacificStamp(signature.signedAt)}${late}${flag}`, 200, cursor.y - 30, 9);
    cursor.y -= 62;
  });
  if (input.signatures.length === 0) draw("No electronic signatures on this revision.", 11);

  for (const audit of input.audits) {
    cursor.page = addPage(doc, cursor);
    draw("Audit certificate", 16, bold);
    const rows = [
      `Signer: ${audit.signerName}`,
      `Role: ${audit.roleLabel}`,
      `Method: ${methodLabel(audit.method)}`,
      `Server time PT: ${pacificStamp(audit.signedAt)}`,
      `Server time UTC: ${utcStamp(audit.signedAt)}`,
      `IP: ${audit.ip || "none"}`,
      `UA summary: ${audit.userAgent || "none"}`,
      `Device id: ${audit.deviceId || "none"}`,
      `Consent version: ${audit.consentVersion || "n/a"}`,
      `recordHash: ${audit.recordHash}`,
      `eventHash: ${audit.eventHash}`,
      `Late: ${audit.late ? "yes" : "no"}`,
    ];
    for (const row of rows) draw(row, 10);
  }
  for (const page of doc.getPages()) stampFooter(page, font, input.footer);
  return doc.save();
}

function addPage(doc: PDFDocument, cursor: { y: number }) {
  const page = doc.addPage([612, 792]);
  cursor.y = 750;
  return page;
}

function stampFooter(page: PDFPage, font: PDFFont, footer: string) {
  const text = pdfSafe(footer).replace(/[^\x20-\x7E]/g, "?");
  page.drawText(text.slice(0, 95), { x: 48, y: 36, size: 8, font, color: rgb(0.25, 0.28, 0.33) });
  if (text.length > 95) {
    page.drawText(text.slice(95, 190), { x: 48, y: 24, size: 8, font, color: rgb(0.25, 0.28, 0.33) });
  }
}

function drawAt(page: PDFPage, font: PDFFont, text: string, x: number, y: number, size: number) {
  page.drawText(pdfSafe(text).replace(/[^\x20-\x7E]/g, "?").slice(0, 90), {
    x,
    y,
    size,
    font,
    color: rgb(0.08, 0.12, 0.2),
  });
}

export async function buildPosterPdf(input: { projectName: string; projectCode: string | null; url: string; qrPng: Uint8Array }) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const page = doc.addPage([612, 792]);
  const qr = await doc.embedPng(input.qrPng);
  page.drawText("CalSite Safety", { x: 48, y: 740, size: 14, font, color: rgb(0.08, 0.12, 0.2) });
  page.drawText("Crew Sign kiosk", { x: 48, y: 710, size: 22, font: bold, color: rgb(0.08, 0.12, 0.2) });
  page.drawText(pdfSafe(input.projectName).replace(/[^\x20-\x7E]/g, "?").slice(0, 60), {
    x: 48,
    y: 678,
    size: 14,
    font,
    color: rgb(0.08, 0.12, 0.2),
  });
  page.drawText(`Project code: ${input.projectCode || "PRJ"}`, { x: 48, y: 656, size: 12, font, color: rgb(0.08, 0.12, 0.2) });
  page.drawImage(qr, { x: 156, y: 360, width: 300, height: 300 });
  page.drawText("Each person taps their own name and enters their own PIN.", { x: 48, y: 320, size: 12, font, color: rgb(0.08, 0.12, 0.2) });
  page.drawText("A paper signature sheet is always available.", { x: 48, y: 300, size: 12, font, color: rgb(0.08, 0.12, 0.2) });
  const url = input.url.replace(/[^\x20-\x7E]/g, "").slice(0, 90);
  page.drawText(url, { x: 48, y: 260, size: 9, font, color: rgb(0.25, 0.28, 0.33) });
  return doc.save();
}
