import { notFound } from "next/navigation";
import { isAppError } from "@/lib/errors";
import { t } from "@/lib/i18n";
import { getActor, getLocale } from "@/lib/session";
import { getMeeting } from "@/lib/services/work";
import { formatPacific } from "@/lib/time";

export default async function MeetingPrint({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [actor, locale] = await Promise.all([getActor(), getLocale()]);
  const meeting = await getMeeting(actor, id).catch((error) => {
    if (isAppError(error) && error.code === "not_found") notFound();
    throw error;
  });
  return (
    <article className="mx-auto max-w-3xl bg-white p-6">
      <p className="text-sm font-semibold uppercase tracking-wide">{t(locale, "brand")}</p>
      <h1 className="mt-2 font-serif text-3xl">{meeting.title}</h1>
      <p className="mt-2 text-sm">{formatPacific(locale, meeting.scheduledAt)} · {meeting.leaderName}</p>
      <p className="text-sm">{meeting.project?.name}</p>
      <p className="note mt-4">{t(locale, "print.note")}</p>
      <p className="mt-2 text-sm">{t(locale, "common.checkbox")}</p>
      <p className="mt-4 text-sm font-semibold">{t(locale, `enum.PolicyBasis.${meeting.policyBasis}`)}</p>
      <h2 className="mt-6 font-serif text-xl">{t(locale, "fields.discussionPoints")}</h2>
      <p className="whitespace-pre-wrap text-sm">{meeting.discussionPoints}</p>
      <h2 className="mt-6 font-serif text-xl">{t(locale, "section.attendance")}</h2>
      <ul className="mt-2 list-disc pl-5 text-sm">
        {meeting.attendance.map((row) => (
          <li key={row.id}>{row.employee.firstName} {row.employee.lastName} · {row.method}</li>
        ))}
      </ul>
    </article>
  );
}
