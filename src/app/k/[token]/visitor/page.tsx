import { notFound } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { KioskFrame } from "@/components/kiosk-frame";
import { SignaturePad } from "@/components/signature-pad";
import { TextField } from "@/components/fields";
import { isAppError } from "@/lib/errors";
import { t } from "@/lib/i18n";
import { getLocale } from "@/lib/session";
import { meetingDate, tailgateAttestation } from "@/lib/sign/format";
import { getKioskView } from "@/lib/services/crew-sign";
import { kioskVisitorAction } from "@/server/kiosk-actions";

export const dynamic = "force-dynamic";

export default async function KioskVisitor({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const locale = await getLocale();
  const view = await getKioskView(token).catch((error) => {
    if (isAppError(error)) notFound();
    throw error;
  });
  const meeting = view.meeting;
  const date = meeting ? meetingDate(meeting.scheduledAt) : "";
  return (
    <KioskFrame locale={locale} title={t(locale, "kiosk.visitor")} subtitle={view.project.name}>
      {!meeting ? <p>{t(locale, "kiosk.noMeeting")}</p> : null}
      {meeting ? (
        <ActionForm action={kioskVisitorAction.bind(null, token)} submitLabel={t(locale, "kiosk.sign")} wide>
          <TextField label={t(locale, "kiosk.visitorName")} name="visitorName" required />
          <TextField label={t(locale, "kiosk.visitorCompany")} name="companyName" required />
          <TextField label={t(locale, "kiosk.printedName")} name="typedName" required />
          <p className="text-sm">{meeting.topic}</p>
          {meeting.signLockedAt ? <p className="note">{t(locale, "kiosk.lateNote")}</p> : null}
          <label className="flex min-h-14 items-start gap-3 text-base">
            <input className="mt-1 h-6 w-6" type="checkbox" name="attestation" value="yes" required />
            <span>{tailgateAttestation(meeting.language, date)}</span>
          </label>
          <SignaturePad label={t(locale, "kiosk.draw")} clearLabel={t(locale, "kiosk.clear")} />
        </ActionForm>
      ) : null}
    </KioskFrame>
  );
}
