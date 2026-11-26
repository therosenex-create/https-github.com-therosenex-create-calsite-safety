import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "./auth.config";
import { contentSecurityPolicyFor } from "./lib/security-headers";

const { auth } = NextAuth(authConfig);

export default auth((request) => {
  const nonce = btoa(crypto.randomUUID());
  const csp = contentSecurityPolicyFor(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  const path = request.nextUrl.pathname;
  if (path.startsWith("/k/") || path.startsWith("/api/sign/")) {
    response.headers.set("Cache-Control", "no-store");
  }
  if (path.startsWith("/k/") && !request.cookies.get("calsite_device")?.value) {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    const id = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
    response.cookies.set("calsite_device", id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return response;
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|icons/|icon.svg|favicon.ico|sw.js|manifest.webmanifest|offline.html).*)"],
};