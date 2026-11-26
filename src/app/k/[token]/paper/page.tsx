import { notFound } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { KioskFrame } from "@/components/kiosk-frame";
import { isAppError } from "@/lib/errors";
import { t } from "@/lib/i18n";
import { getLocale } from "@/lib/session";
import { getKioskView } from "@/lib/services/crew-sign";
import { kioskPaperAction } from "@/server/kiosk-actions";

export const dynamic = "force-dynamic";

export default async function KioskPaper({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const locale = await getLocale();
  const view = await getKioskView(token).catch((error) => {
    if (isAppError(error)) notFound();
    throw error;
  });
  return (
    <KioskFrame locale={locale} title={t(locale, "kiosk.upload")} subtitle={view.project.name}>
      <ActionForm action={kioskPaperAction.bind(null, token)} submitLabel={t(locale, "kiosk.upload")} multipart wide>
        <p className="hint">{t(locale, "kiosk.uploadHint")}</p>
        <label className="block">
          <span className="label">{t(locale, "fields.file")}</span>
          <input className="mt-1 block w-full text-base" type="file" name="file" accept="image/jpeg,image/heic,image/heif,application/pdf" required />
        </label>
        <label className="block">
          <span className="label">{t(locale, "kiosk.yourPin")}</span>
          <input className="input text-2xl tracking-widest" name="pin" inputMode="numeric" autoComplete="off" pattern="[0-9]*" minLength={4} maxLength={6} required />
        </label>
      </ActionForm>
    </KioskFrame>
  );
}
