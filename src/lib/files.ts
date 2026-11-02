import { AppError } from "./errors";

export const MAX_FILE_BYTES = 4 * 1024 * 1024;

const ALLOWED: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "text/plain": "txt",
};

export function assertAllowedFile(mimeType: string, byteLength: number) {
  if (!ALLOWED[mimeType]) {
    throw new AppError("file_type");
  }
  if (byteLength > MAX_FILE_BYTES) {
    throw new AppError("file_too_large");
  }
}

export function safeFileName(name: string, mimeType: string) {
  const extension = ALLOWED[mimeType] ?? "bin";
  const base = name.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
  const stem = base.replace(/\.[A-Za-z0-9]+$/, "") || "document";
  return `${stem}.${extension}`;
}
