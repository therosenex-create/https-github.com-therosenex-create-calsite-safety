/** v1.1 hook. A configured PKCS#12 does not change the stored PDF in this release. */
export function padesConfigured() {
  return Boolean(process.env.SIGNING_P12_BASE64 && process.env.SIGNING_P12_PASSWORD);
}

export function applyOptionalPades(bytes: Uint8Array) {
  if (!padesConfigured()) return { bytes, pades: false as const };
  return { bytes, pades: false as const, note: "PAdES is reserved for v1.1. This PDF is stored with its sha256." };
}
