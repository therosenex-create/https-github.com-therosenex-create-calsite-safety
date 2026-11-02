import Link from "next/link";
import { PublicHeader, SkipLink } from "@/components/shell";
import { t } from "@/lib/i18n";
import { getLocale } from "@/lib/session";

export default async function HomePage() {
  const locale = await getLocale();
  return (
    <>
      <SkipLink locale={locale} />
      <PublicHeader locale={locale} />
      <main id="content" className="mx-auto max-w-5xl px-4 py-10">
        <p className="text-sm font-semibold uppercase tracking-wide text-amber">{t(locale, "tagline")}</p>
        <h1 className="mt-3 max-w-3xl font-serif text-4xl leading-tight text-navy md:text-5xl">{t(locale, "landing.lead")}</h1>
        <p className="mt-4 max-w-2xl text-lg text-muted">{t(locale, "landing.for")}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link className="btn" href="/sign-up">
            {t(locale, "nav.signUp")}
          </Link>
          <Link className="btn-secondary" href="/sign-in">
            {t(locale, "nav.signIn")}
          </Link>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <section className="card">
            <h2 className="font-serif text-2xl text-navy">{t(locale, "landing.does")}</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6">
              <li>{t(locale, "landing.item1")}</li>
              <li>{t(locale, "landing.item2")}</li>
              <li>{t(locale, "landing.item3")}</li>
              <li>{t(locale, "landing.item4")}</li>
            </ul>
          </section>
          <section className="card">
            <h2 className="font-serif text-2xl text-navy">{t(locale, "landing.doesNot")}</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6">
              <li>{t(locale, "landing.not1")}</li>
              <li>{t(locale, "landing.not2")}</li>
              <li>{t(locale, "landing.not3")}</li>
              <li>{t(locale, "landing.not4")}</li>
            </ul>
          </section>
        </div>
      </main>
    </>
  );
}
