import { AppError } from "../errors";

const PNG = [0x89, 0x50, 0x4e, 0x47];

export function decodeSignaturePng(input: string) {
  const trimmed = input.trim();
  const base64 = trimmed.startsWith("data:") ? (trimmed.split(",")[1] ?? "") : trimmed;
  const compact = base64.replace(/\s+/g, "");
  if (!compact || !/^[A-Za-z0-9+/=]+$/.test(compact)) throw new AppError("signature_required");
  const bytes = Buffer.from(compact, "base64");
  if (bytes.length < 32 || bytes.length > 500_000) throw new AppError("signature_required");
  if (PNG.some((byte, index) => bytes[index] !== byte)) throw new AppError("signature_required");
  return bytes;
}

export function parseStrokes(input: unknown) {
  const value = typeof input === "string" ? parseJson(input) : input;
  if (!Array.isArray(value) || value.length === 0 || value.length > 80) throw new AppError("signature_required");
  const strokes = value.map((stroke) => {
    if (!Array.isArray(stroke) || stroke.length === 0 || stroke.length > 2000) throw new AppError("signature_required");
    return stroke.map((point) => {
      if (!point || typeof point !== "object") throw new AppError("signature_required");
      const x = Number((point as { x?: unknown }).x);
      const y = Number((point as { y?: unknown }).y);
      if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || y < 0 || x > 4000 || y > 4000) {
        throw new AppError("signature_required");
      }
      return { x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 };
    });
  });
  return strokes;
}

function parseJson(input: string) {
  if (input.length > 80_000) throw new AppError("signature_required");
  try {
    return JSON.parse(input) as unknown;
  } catch {
    throw new AppError("signature_required");
  }
}
