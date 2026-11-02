import type { Metadata } from "next";
import { getLocale } from "@/lib/session";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "CalSite Safety", template: "%s · CalSite Safety" },
  description: "Safer Sites. Smarter Compliance.",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
