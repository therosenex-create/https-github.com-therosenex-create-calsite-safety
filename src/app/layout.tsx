import type { Metadata, Viewport } from "next";
import { PwaRegister } from "@/components/pwa-register";
import { t } from "@/lib/i18n";
import { getLocale } from "@/lib/session";
import "./globals.css";

export const metadata: Metadata = {
  applicationName: "CalSite Safety",
  title: { default: "CalSite Safety", template: "%s · CalSite Safety" },
  description: "Safer Sites. Smarter Compliance.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "CalSite",
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0B1F3A",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale}>
      <body className="font-sans antialiased">
        {children}
        <PwaRegister updateLabel={t(locale, "pwa.update")} refreshLabel={t(locale, "pwa.refresh")} />
      </body>
    </html>
  );
}
