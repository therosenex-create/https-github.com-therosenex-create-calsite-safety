import { createHash } from "crypto";

export function sha256(text: string | Buffer): string {
  const digest = createHash("sha256");
  if (typeof text === "string") digest.update(text, "utf8");
  else digest.update(text);
  return digest.digest("hex");
}

/**
 * Placeholder comparison for catalog text. It does not download a regulation
 * and it does not decide whether the law changed.
 */
export function summarizeCatalogChange(before: string, after: string): string {
  if (sha256(before) === sha256(after)) {
    return "No change in the catalog summary text. This check does not retrieve the official source.";
  }
  return "The catalog summary text changed. This does not establish that the official regulation changed, and it does not determine a legal effective date. Qualified review is required.";
}
