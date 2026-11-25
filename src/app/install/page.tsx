import { headers } from "next/headers";
import { PrintButton } from "@/components/print-button";
import { InstallPrompt } from "@/components/install-prompt";
import { PublicHeader, Shell, SkipLink } from "@/components/shell";
import { installPageUrl } from "@/lib/install-url";
import { t, type Locale } from "@/lib/i18n";
import { qrSvg } from "@/lib/qr-svg";
import { getActorOrNull, getLocale } from "@/lib/session";

function Steps({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="card">
      <h2 className="font-serif text-2xl text-navy">{title}</h2>
      <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ol>
    </section>
  );
}

function InstallBody({ locale, url }: { locale: Locale; url: string }) {
  const absolute = url.startsWith("http://") || url.startsWith("https://");
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl text-navy">{t(locale, "install.title")}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6">{t(locale, "install.lead")}</p>
        <p className="note mt-4">{t(locale, "install.offlineNote")}</p>
      </div>
      <Steps
        title={t(locale, "install.iphone")}
        items={[t(locale, "install.iphone1"), t(locale, "install.iphone2"), t(locale, "install.iphone3"), t(locale, "install.iphone4")]}
      />
      <section className="card">
        <h2 className="font-serif text-2xl text-navy">{t(locale, "install.android")}</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6">
          <li>{t(locale, "install.android1")}</li>
          <li>{t(locale, "install.android2")}</li>
          <li>{t(locale, "install.android3")}</li>
        </ol>
        <div className="mt-4">
          <InstallPrompt
            installLabel={t(locale, "install.button")}
            installedLabel={t(locale, "install.installed")}
            unavailableLabel={t(locale, "install.buttonHelp")}
          />
        </div>
      </section>
      <section className="card" id="crew-link">
        <h2 className="font-serif text-2xl text-navy">{t(locale, "install.qrTitle")}</h2>
        <p className="mt-2 text-sm leading-6">{t(locale, "install.qrHint")}</p>
        <p className="label mt-4">{t(locale, "install.urlLabel")}</p>
        <p className="mt-1 break-all font-mono text-lg font-semibold text-navy">{url}</p>
        {absolute ? (
          <div
            className="qr-print mt-4 inline-block bg-white p-2"
            dangerouslySetInnerHTML={{ __html: qrSvg(url, t(locale, "install.qrTitle")) }}
          />
        ) : null}
        <div className="mt-4">
          <PrintButton label={t(locale, "install.print")} />
        </div>
      </section>
    </div>
  );
}

export default async function InstallPage() {
  const [locale, actor, headerList] = await Promise.all([getLocale(), getActorOrNull(), headers()]);
  const url = installPageUrl({
    authUrl: process.env.AUTH_URL,
    netlifyUrl: process.env.URL,
    forwardedHost: headerList.get("x-forwarded-host"),
    host: headerList.get("host"),
    proto: headerList.get("x-forwarded-proto"),
  });
  const body = <InstallBody locale={locale} url={url} />;
  if (actor) {
    return (
      <Shell actor={actor} locale={locale}>
        {body}
      </Shell>
    );
  }
  return (
    <>
      <SkipLink locale={locale} />
      <PublicHeader locale={locale} />
      <main id="content" className="mx-auto max-w-3xl px-4 py-10">
        {body}
      </main>
    </>
  );
}
