import { notFound } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { KioskFrame } from "@/components/kiosk-frame";
import { SignaturePad } from "@/components/signature-pad";
import { SelectField, TextArea } from "@/components/fields";
import { isAppError } from "@/lib/errors";
import { t } from "@/lib/i18n";
import { getLocale } from "@/lib/session";
import { employeeName, meetingDate, tailgateAttestation } from "@/lib/sign/format";
import { getKioskView } from "@/lib/services/crew-sign";
import { TAILGATE_TOPICS } from "@/lib/tailgate-topics";
import { pacificTodayInput } from "@/lib/time";
import { kioskFinishAction, kioskSignAction, kioskStartAction } from "@/server/kiosk-actions";

export const dynamic = "force-dynamic";

export default async function KioskWorker({ params }: { params: Promise<{ token: string; employeeId: string }> }) {
  const { token, employeeId } = await params;
  const locale = await getLocale();
  const view = await getKioskView(token).catch((error) => {
    if (isAppError(error)) notFound();
    throw error;
  });
  const person = view.roster.find((row) => row.id === employeeId);
  if (!person) notFound();
  const name = employeeName(person);
  const meeting = view.meeting;
  const signed = meeting ? view.signatures.some((event) => event.employeeId === person.id) : false;
  const isForeman = meeting?.conductorEmployeeId === person.id;
  const open = Boolean(meeting && !meeting.signLockedAt);
  const date = meeting ? meetingDate(meeting.scheduledAt) : pacificTodayInput();
  const topicIndex = Number(date.slice(-2)) % TAILGATE_TOPICS.length;
  return (
    <KioskFrame locale={locale} title={name} subtitle={view.project.name}>
      {!meeting ? (
        <ActionForm action={kioskStartAction.bind(null, token)} submitLabel={t(locale, "kiosk.start")} wide>
          <input type="hidden" name="employeeId" value={person.id} />
          <p className="text-base font-semibold">{t(locale, "kiosk.dateFixed")}</p>
          <p className="text-2xl font-semibold text-navy">{date}</p>
          <SelectField label={t(locale, "tailgate.topic")} name="topicCode" defaultValue={TAILGATE_TOPICS[topicIndex]?.code ?? "1509"}>
            {TAILGATE_TOPICS.map((topic) => (
              <option key={topic.code} value={topic.code}>
                {locale === "es" ? topic.titleEs : topic.titleEn}
              </option>
            ))}
          </SelectField>
          <TextArea label={t(locale, "kiosk.points")} name="points" required rows={4} />
          <TextArea label={t(locale, "kiosk.hazards")} name="hazards" rows={3} />
          <SelectField label={t(locale, "fields.language")} name="language" defaultValue={person.preferredLanguage === "es" ? "es" : locale}>
            <option value="en">English</option>
            <option value="es">Español</option>
          </SelectField>
          <label className="block">
            <span className="label">{t(locale, "kiosk.yourPin")}</span>
            <input className="input text-2xl tracking-widest" name="pin" inputMode="numeric" autoComplete="off" pattern="[0-9]*" minLength={4} maxLength={6} required />
          </label>
        </ActionForm>
      ) : null}
      {meeting && !signed ? (
        <ActionForm action={kioskSignAction.bind(null, token)} submitLabel={t(locale, "kiosk.sign")} wide>
          <input type="hidden" name="employeeId" value={person.id} />
          <section className="card">
            <h2 className="font-serif text-2xl">{t(locale, "kiosk.summary")}</h2>
            <p className="mt-2 text-base">{meeting.topic}</p>
            <p className="mt-2 text-sm">{date}</p>
            <p className="mt-3 whitespace-pre-wrap text-sm">{meeting.discussionPoints}</p>
            {meeting.hazards ? <p className="mt-2 whitespace-pre-wrap text-sm">{meeting.hazards}</p> : null}
          </section>
          {meeting.signLockedAt ? <p className="note">{t(locale, "kiosk.lateNote")}</p> : null}
          <label className="flex min-h-14 items-start gap-3 text-base">
            <input className="mt-1 h-6 w-6" type="checkbox" name="attestation" value="yes" required />
            <span>{tailgateAttestation(meeting.language, date)}</span>
          </label>
          <SignaturePad label={t(locale, "kiosk.draw")} clearLabel={t(locale, "kiosk.clear")} />
          <label className="block">
            <span className="label">{t(locale, "kiosk.yourPin")}</span>
            <input className="input text-2xl tracking-widest" name="pin" inputMode="numeric" autoComplete="off" pattern="[0-9]*" minLength={4} maxLength={6} required />
          </label>
        </ActionForm>
      ) : null}
      {signed ? <p className="note">{t(locale, "kiosk.alreadySigned")}</p> : null}
      {signed ? <p>{t(locale, "kiosk.passPhone")}</p> : null}
      {open && isForeman && signed ? (
        <ActionForm action={kioskFinishAction.bind(null, token)} submitLabel={t(locale, "kiosk.finish")} wide>
          <input type="hidden" name="employeeId" value={person.id} />
          <label className="block">
            <span className="label">{t(locale, "kiosk.yourPin")}</span>
            <input className="input text-2xl tracking-widest" name="pin" inputMode="numeric" autoComplete="off" pattern="[0-9]*" minLength={4} maxLength={6} required />
          </label>
        </ActionForm>
      ) : null}
    </KioskFrame>
  );
}
