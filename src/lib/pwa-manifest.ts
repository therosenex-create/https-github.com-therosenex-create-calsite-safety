import type { MetadataRoute } from "next";

/**
 * Web app manifest for the home-screen install.
 * start_url is the signed-in workspace. scope is the whole origin so sign-in
 * stays inside the installed app. id stays "/" if start_url changes later.
 */
export const webManifest = {
  id: "/",
  name: "CalSite Safety",
  short_name: "CalSite",
  description: "Safer Sites. Smarter Compliance.",
  start_url: "/app",
  scope: "/",
  display: "standalone",
  background_color: "#F3F0E8",
  theme_color: "#0B1F3A",
  icons: [
    { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
    { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    { src: "/icons/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
    { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
  ],
} satisfies MetadataRoute.Manifest;
