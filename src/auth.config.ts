import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  trustHost: true,
  session: { strategy: "jwt", maxAge: 60 * 60 * 12 },
  pages: { signIn: "/sign-in" },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const path = request.nextUrl.pathname;
      if (path === "/app" || path.startsWith("/app/")) return Boolean(auth?.user);
      return true;
    },
    jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      if (user && typeof user.sessionVersion === "number") token.sessionVersion = user.sessionVersion;
      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub) session.user.id = token.sub;
      if (session.user) session.user.sessionVersion = typeof token.sessionVersion === "number" ? token.sessionVersion : 0;
      return session;
    },
  },
} satisfies NextAuthConfig;
