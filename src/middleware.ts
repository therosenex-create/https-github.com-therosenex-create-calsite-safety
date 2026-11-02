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
  return response;
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|icon.svg).*)"],
};