import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { describe, expect, it } from "vitest";
import nextConfig from "../next.config";
import manifest from "../src/app/manifest";
import { installPageUrl } from "../src/lib/install-url";
import { t } from "../src/lib/i18n";
import { webManifest } from "../src/lib/pwa-manifest";
import { qrSvg } from "../src/lib/qr-svg";
import { contentSecurityPolicyFor } from "../src/lib/security-headers";

const root = path.resolve(__dirname, "..");

function pngSize(file: string) {
  const buf = fs.readFileSync(file);
  expect(buf.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

type DecisionInput = {
  method: string;
  pathname: string;
  search: string;
  mode: string;
  destination: string;
  hasRange: boolean;
  hasRscHeader: boolean;
};

type SwApi = {
  PWA_CACHE: string;
  pwaDecision: (input: DecisionInput) => string;
  handleFetch: (event: { request: Request; respondWith: (value: Promise<Response> | Response) => void }) => void;
};

function loadServiceWorker() {
  const puts: string[] = [];
  let fetchImpl: (request: Request) => Promise<Response> = async () => new Response("ok", { status: 200 });
  const offline = new Response("offline-page", { status: 200, headers: { "Content-Type": "text/html" } });
  const context: Record<string, unknown> = {
    URL,
    Response,
    Request,
    Promise,
    console,
  };
  const self = {
    location: { origin: "https://calsite.test" },
    addEventListener() {},
    skipWaiting() {
      return Promise.resolve();
    },
    clients: { claim: () => Promise.resolve() },
  };
  context.self = self;
  context.caches = {
    async open() {
      return {
        async match(key: Request | string) {
          const url = typeof key === "string" ? key : key.url;
          return url.endsWith("/offline.html") ? offline : undefined;
        },
        async put(request: Request) {
          puts.push(new URL(request.url).pathname);
        },
        async addAll() {},
      };
    },
    async keys() {
      return [];
    },
    async delete() {
      return true;
    },
  };
  context.fetch = (request: Request) => fetchImpl(request);
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root, "public/sw.js"), "utf8"), context);
  const api = (self as { __CALSITE_PWA__?: SwApi }).__CALSITE_PWA__;
  if (!api) throw new Error("service worker did not export its policy");
  return {
    api,
    puts,
    setFetch(next: (request: Request) => Promise<Response>) {
      fetchImpl = next;
    },
  };
}

const base = {
  search: "",
  mode: "cors",
  destination: "",
  hasRange: false,
  hasRscHeader: false,
};

describe("web app manifest", () => {
  it("names the home-screen app and points signed-in users at /app", () => {
    expect(manifest()).toEqual(webManifest);
    expect(webManifest.name).toBe("CalSite Safety");
    expect(webManifest.short_name).toBe("CalSite");
    expect(webManifest.display).toBe("standalone");
    expect(webManifest.start_url).toBe("/app");
    expect(webManifest.scope).toBe("/");
    expect(webManifest.theme_color).toBe("#0B1F3A");
    expect(webManifest.background_color).toBe("#F3F0E8");
    expect(webManifest.icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sizes: "192x192", purpose: "any" }),
        expect.objectContaining({ sizes: "512x512", purpose: "any" }),
        expect.objectContaining({ sizes: "192x192", purpose: "maskable" }),
        expect.objectContaining({ sizes: "512x512", purpose: "maskable" }),
      ]),
    );
  });

  it("ships the icon files at the sizes the manifest names", () => {
    expect(pngSize(path.join(root, "public/icons/icon-192.png"))).toEqual({ width: 192, height: 192 });
    expect(pngSize(path.join(root, "public/icons/icon-512.png"))).toEqual({ width: 512, height: 512 });
    expect(pngSize(path.join(root, "public/icons/icon-maskable-192.png"))).toEqual({ width: 192, height: 192 });
    expect(pngSize(path.join(root, "public/icons/icon-maskable-512.png"))).toEqual({ width: 512, height: 512 });
    expect(pngSize(path.join(root, "public/icons/apple-touch-icon.png"))).toEqual({ width: 180, height: 180 });
    expect(pngSize(path.join(root, "public/icons/favicon-32.png"))).toEqual({ width: 32, height: 32 });
    expect(pngSize(path.join(root, "public/icons/icon-1024.png"))).toEqual({ width: 1024, height: 1024 });
  });
});

describe("service worker cache policy", () => {
  const sw = loadServiceWorker();

  it("does not cache API, auth, session, or record navigations", () => {
    const { pwaDecision } = sw.api;
    expect(pwaDecision({ ...base, method: "GET", pathname: "/api/auth/session" })).toBe("passthrough");
    expect(pwaDecision({ ...base, method: "GET", pathname: "/api/auth/csrf" })).toBe("passthrough");
    expect(pwaDecision({ ...base, method: "POST", pathname: "/api/auth/callback/credentials" })).toBe("passthrough");
    expect(pwaDecision({ ...base, method: "GET", pathname: "/api/health" })).toBe("passthrough");
    expect(pwaDecision({ ...base, method: "GET", pathname: "/api/documents/record-1" })).toBe("passthrough");
    expect(pwaDecision({ ...base, method: "GET", pathname: "/auth/signin" })).toBe("passthrough");
    expect(pwaDecision({ ...base, method: "POST", pathname: "/sign-in" })).toBe("passthrough");
    expect(pwaDecision({ ...base, method: "GET", pathname: "/app/incidents/1", mode: "navigate", destination: "document" })).toBe(
      "navigate-network",
    );
    expect(pwaDecision({ ...base, method: "GET", pathname: "/sign-in", mode: "navigate", destination: "document" })).toBe(
      "navigate-network",
    );
    expect(pwaDecision({ ...base, method: "GET", pathname: "/app", hasRscHeader: true })).toBe("passthrough");
    expect(pwaDecision({ ...base, method: "GET", pathname: "/app", search: "?_rsc=abc", mode: "navigate" })).toBe("passthrough");
    expect(pwaDecision({ ...base, method: "GET", pathname: "/icons/icon-192.png", destination: "image" })).toBe("passthrough");
    expect(pwaDecision({ ...base, method: "GET", pathname: "/manifest.webmanifest" })).toBe("passthrough");
    expect(pwaDecision({ ...base, method: "GET", pathname: "/offline.html" })).toBe("static");
    expect(pwaDecision({ ...base, method: "GET", pathname: "/_next/static/chunks/main.js", destination: "script" })).toBe("static");
    expect(pwaDecision({ ...base, method: "GET", pathname: "/_next/static/chunks/main.js", hasRange: true })).toBe("passthrough");
    expect(sw.api.PWA_CACHE).toBe("calsite-static-v1");
  });

  it("does not write an API or record response into the cache", async () => {
    sw.puts.length = 0;
    let responded = false;
    sw.api.handleFetch({
      request: new Request("https://calsite.test/api/auth/session"),
      respondWith() {
        responded = true;
      },
    });
    expect(responded).toBe(false);

    sw.setFetch(async () => {
      throw new Error("offline");
    });
    const navigation = {
      url: "https://calsite.test/app/incidents/1",
      method: "GET",
      mode: "navigate",
      destination: "document",
      headers: new Headers(),
    } as Request;
    let response: Response | undefined;
    sw.api.handleFetch({
      request: navigation,
      respondWith(value) {
        void Promise.resolve(value).then((body) => {
          response = body;
        });
      },
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(response).toBeDefined();
    expect(await response?.text()).toBe("offline-page");
    expect(sw.puts).toEqual([]);
  });

  it("caches a hashed static asset and nothing else from that response", async () => {
    sw.puts.length = 0;
    sw.setFetch(async () => ({ ok: true, type: "basic", redirected: false, clone() { return this; } }) as unknown as Response);
    let pending: Promise<Response> | undefined;
    sw.api.handleFetch({
      request: new Request("https://calsite.test/_next/static/chunks/app-123.js"),
      respondWith(value) {
        pending = Promise.resolve(value);
      },
    });
    await pending;
    expect(sw.puts).toEqual(["/_next/static/chunks/app-123.js"]);
    const source = fs.readFileSync(path.join(root, "public/sw.js"), "utf8");
    expect(source.match(/cache\.put/g)).toHaveLength(1);
    expect(source).toContain("skipWaiting");
  });
});

describe("install page support", () => {
  it("keeps English and Spanish install copy distinct", () => {
    for (const key of ["install.title", "install.lead", "install.iphone1", "install.android2", "nav.install", "pwa.update"]) {
      expect(t("en", key)).not.toBe(key);
      expect(t("es", key)).not.toBe(key);
      expect(t("en", key)).not.toBe(t("es", key));
    }
  });

  it("builds an absolute crew URL and refuses a malformed host", () => {
    expect(installPageUrl({ authUrl: "https://calsite.example/app" })).toBe("https://calsite.example/install");
    expect(installPageUrl({ netlifyUrl: "https://calsite-safety.netlify.app" })).toBe("https://calsite-safety.netlify.app/install");
    expect(installPageUrl({ host: "localhost:3000", proto: "http" })).toBe("http://localhost:3000/install");
    expect(installPageUrl({ host: "evil.example\n.attacker", proto: "https" })).toBe("/install");
    expect(installPageUrl({ authUrl: "javascript:alert(1)", host: "crew.example" })).toBe("https://crew.example/install");
  });

  it("draws a QR without putting the URL in the markup as HTML", () => {
    const svg = qrSvg("https://calsite.example/install?q=1&x=2", "Crew & link");
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).not.toContain("<script");
    expect(svg).toContain("Crew &amp; link");
    expect(svg).not.toContain("https://calsite.example");
  });
});

describe("PWA response headers", () => {
  it("allows the service worker in the page CSP", () => {
    expect(contentSecurityPolicyFor("nonce-test")).toContain("worker-src 'self'");
  });

  it("does not cache sw.js for long and sets manifest and worker types", async () => {
    if (!nextConfig.headers) throw new Error("next config is missing headers()");
    const rules = await nextConfig.headers();
    const sw = rules.find((rule) => rule.source === "/sw.js");
    const manifestRule = rules.find((rule) => rule.source === "/manifest.webmanifest");
    expect(sw?.headers).toEqual(
      expect.arrayContaining([
        { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
      ]),
    );
    expect(manifestRule?.headers).toEqual(
      expect.arrayContaining([{ key: "Content-Type", value: "application/manifest+json; charset=utf-8" }]),
    );
    const netlify = fs.readFileSync(path.join(root, "netlify.toml"), "utf8");
    expect(netlify).toContain('for = "/sw.js"');
    expect(netlify).toContain("no-cache, no-store, must-revalidate");
    expect(netlify).toContain("application/manifest+json");
    const layout = fs.readFileSync(path.join(root, "src/app/layout.tsx"), "utf8");
    expect(layout).toContain('apple-mobile-web-app-capable": "yes"');
    expect(layout).toContain('statusBarStyle: "black-translucent"');
    expect(layout).toContain('viewportFit: "cover"');
    expect(layout).toContain('themeColor: "#0B1F3A"');
    const offline = fs.readFileSync(path.join(root, "public/offline.html"), "utf8");
    expect(offline).toContain("You're offline");
    expect(offline).toContain("Está sin conexión");
    expect(offline.toLowerCase()).not.toContain("<script");
  });
});
