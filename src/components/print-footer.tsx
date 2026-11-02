import type { Locale } from "@/lib/i18n";
import { t } from "@/lib/i18n";

export function PrintFooter({ locale, demonstration }: { locale: Locale; demonstration: boolean }) {
  return (
    <footer className="mt-8 border-t border-line pt-3 text-xs">
      <p>{demonstration ? t(locale, "print.demo") : t(locale, "print.operational")}</p>
      <p>{t(locale, "print.notFiling")}</p>
      <p>{t(locale, "print.note")}</p>
    </footer>
  );
}
