import Link from "next/link";
import type { Actor } from "@/lib/actor";
import { t, type Locale } from "@/lib/i18n";
import { setLocaleAction, signOutAction } from "@/server/actions";

const primary = [
  ["/app", "nav.dashboard"],
  ["/app/projects", "nav.projects"],
  ["/app/meetings", "nav.meetings"],
  ["/app/inspections", "nav.inspections"],
] as const;

const more = [
  ["/app/employees", "nav.people"],
  ["/app/training", "nav.training"],
  ["/app/incidents", "nav.incidents"],
  ["/app/documents", "nav.files"],
  ["/app/iipp", "nav.iipp"],
  ["/app/regulatory", "nav.requirements"],
  ["/app/regulatory/reviews", "nav.reviews"],
  ["/app/licensing", "nav.licensing"],
  ["/app/permits", "nav.permits"],
  ["/app/public-works", "nav.publicWorks"],
  ["/app/local-rules", "nav.localRules"],
  ["/app/packets", "nav.packets"],
  ["/app/heat", "nav.heat"],
  ["/app/smoke", "nav.smoke"],
  ["/app/jurisdictions", "nav.cities"],
  ["/app/guidance", "nav.guidance"],
  ["/app/settings", "nav.settings"],
] as const;

function NavLinks({ locale, items, className }: { locale: Locale; items: readonly (readonly [string, string])[]; className: string }) {
  return (
    <ul className={className}>
      {items.map(([href, key]) => (
        <li key={href}>
          <Link className="block rounded-md px-3 py-2 text-sm font-semibold hover:bg-white/10" href={href}>
            {t(locale, key)}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function Shell({ actor, locale, children }: { actor: Actor; locale: Locale; children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <a className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:bg-white focus:px-3 focus:py-2" href="#content">
        Skip
      </a>
      <header className="sticky top-0 z-30 border-b border-white/10 bg-navy text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div>
            <Link href="/app" className="font-serif text-xl">
              {t(locale, "brand")}
            </Link>
            <p className="text-xs text-white/70">{actor.organizationName}</p>
          </div>
          <div className="flex items-center gap-2">
            <form action={setLocaleAction} className="flex gap-1">
              <input type="hidden" name="locale" value="en" />
              <button className="min-h-11 rounded-md px-3 text-sm font-semibold" type="submit" aria-pressed={locale === "en"}>
                EN
              </button>
            </form>
            <form action={setLocaleAction}>
              <input type="hidden" name="locale" value="es" />
              <button className="min-h-11 rounded-md px-3 text-sm font-semibold" type="submit" aria-pressed={locale === "es"}>
                ES
              </button>
            </form>
            <form action={signOutAction}>
              <button className="btn bg-white text-navy hover:bg-sand" type="submit">
                {t(locale, "nav.signOut")}
              </button>
            </form>
          </div>
        </div>
        <p className="bg-navy-800 px-4 py-2 text-center text-xs leading-5 text-white/90">{t(locale, "banner")}</p>
        {actor.isDemonstration ? <p className="bg-[#f8f1de] px-4 py-2 text-center text-sm text-ink">{t(locale, "demoBanner")}</p> : null}
      </header>
      <div className="mx-auto flex max-w-6xl">
        <nav className="no-print hidden w-52 shrink-0 p-4 md:block" aria-label="Primary">
          <NavLinks locale={locale} items={[...primary, ...more]} className="space-y-1 text-navy" />
        </nav>
        <main id="content" className="min-w-0 flex-1 px-4 py-6 pb-28 md:pb-10">
          {children}
        </main>
      </div>
      <nav className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white md:hidden" aria-label="Mobile">
        <ul className="grid grid-cols-5">
          {primary.map(([href, key]) => (
            <li key={href}>
              <Link className="flex min-h-14 items-center justify-center px-1 text-center text-xs font-semibold text-navy" href={href}>
                {t(locale, key)}
              </Link>
            </li>
          ))}
          <li>
            <details>
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-center text-xs font-semibold text-navy">
                {t(locale, "nav.more")}
              </summary>
              <div className="absolute bottom-14 right-2 w-56 rounded-lg border border-line bg-white p-2 shadow-card">
                <NavLinks locale={locale} items={more} className="text-navy" />
              </div>
            </details>
          </li>
        </ul>
      </nav>
    </div>
  );
}

export function PublicHeader({ locale }: { locale: Locale }) {
  return (
    <header className="bg-navy text-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <Link href="/" className="font-serif text-2xl">
          {t(locale, "brand")}
        </Link>
        <div className="flex items-center gap-2">
          <form action={setLocaleAction}>
            <input type="hidden" name="locale" value={locale === "es" ? "en" : "es"} />
            <button className="min-h-11 rounded-md px-3 text-sm font-semibold" type="submit">
              {locale === "es" ? "EN" : "ES"}
            </button>
          </form>
          <Link className="btn bg-white text-navy" href="/sign-in">
            {t(locale, "nav.signIn")}
          </Link>
        </div>
      </div>
      <p className="bg-navy-800 px-4 py-2 text-center text-xs leading-5">{t(locale, "banner")}</p>
    </header>
  );
}
