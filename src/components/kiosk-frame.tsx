import { setLocaleAction } from "@/server/actions";
import { t, type Locale } from "@/lib/i18n";

export function KioskFrame({
  locale,
  title,
  subtitle,
  children,
}: {
  locale: Locale;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto min-h-screen w-full max-w-[430px] px-4 py-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold uppercase tracking-wide text-navy">{t(locale, "brand")}</p>
        <div className="flex gap-1">
          <form action={setLocaleAction}>
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
        </div>
      </div>
      <h1 className="mt-4 font-serif text-3xl leading-tight text-navy">{title}</h1>
      {subtitle ? <p className="mt-2 text-base text-muted">{subtitle}</p> : null}
      <div className="mt-5 space-y-4">{children}</div>
      <p className="note mt-6">{t(locale, "kiosk.paperOption")}</p>
    </div>
  );
}
