import { qrcodegen } from "@/lib/vendor/qrcodegen";

function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => {
    if (ch === "&") return "&amp;";
    if (ch === "<") return "&lt;";
    if (ch === ">") return "&gt;";
    if (ch === '"') return "&quot;";
    return "&apos;";
  });
}

/** Square SVG QR for a short URL. High error correction, for a printed page. */
export function qrSvg(text: string, title: string): string {
  const qr = qrcodegen.QrCode.encodeText(text, qrcodegen.QrCode.Ecc.HIGH);
  const quiet = 4;
  const cells: string[] = [];
  for (let y = 0; y < qr.size; y += 1) {
    for (let x = 0; x < qr.size; x += 1) {
      if (qr.getModule(x, y)) cells.push(`<rect x="${x + quiet}" y="${y + quiet}" width="1" height="1"/>`);
    }
  }
  const dim = qr.size + quiet * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${dim} ${dim}" shape-rendering="crispEdges" role="img" aria-labelledby="qr-title"><title id="qr-title">${escapeXml(title)}</title><rect width="${dim}" height="${dim}" fill="#ffffff"/><g fill="#0B1F3A">${cells.join("")}</g></svg>`;
}
