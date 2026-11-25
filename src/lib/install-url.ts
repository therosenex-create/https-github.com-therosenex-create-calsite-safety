const HOST = /^[a-z0-9.-]+(?::\d+)?$/i;

function originOf(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.origin;
  } catch {
    return null;
  }
}

/**
 * Absolute URL of the install page for the printed QR.
 * AUTH_URL wins, then Netlify's URL, then the request host.
 * A relative "/install" means we will not draw a QR.
 */
export function installPageUrl(input: {
  authUrl?: string | null;
  netlifyUrl?: string | null;
  forwardedHost?: string | null;
  host?: string | null;
  proto?: string | null;
}): string {
  const fromEnv = originOf(input.authUrl) ?? originOf(input.netlifyUrl);
  if (fromEnv) return new URL("/install", fromEnv).href;

  const raw = (input.forwardedHost ?? input.host ?? "").split(",")[0]?.trim() ?? "";
  if (!HOST.test(raw)) return "/install";
  const scheme = input.proto?.split(",")[0]?.trim().toLowerCase() === "http" ? "http" : "https";
  return `${scheme}://${raw}/install`;
}
