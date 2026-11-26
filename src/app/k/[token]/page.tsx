import Link from "next/link";
import { notFound } from "next/navigation";
import { KioskFrame } from "@/components/kiosk-frame";
import { isAppError } from "@/lib/errors";
import { t } from "@/lib/i18n";
import { getLocale } from "@/lib/session";
import { employeeName } from "@/lib/sign/format";
import { getKioskView } from "@/lib/services/crew-sign";

export const dynamic = "force-dynamic";

export default async function KioskHome({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const locale = await getLocale();
  const view = await getKioskView(token).catch((error) => {
    if (isAppError(error)) notFound();
    throw error;
  });
  const open = view.meeting && !view.meeting.signLockedAt;
  return (
    <KioskFrame locale={locale} title={view.project.name} subtitle={view.project.code ?? undefined}>
      <p className="text-base">
        {view.meeting ? t(locale, open ? "kiosk.inProgress" : "kiosk.finished") : t(locale, "kiosk.noMeeting")}
      </p>
      <h2 className="font-serif text-2xl text-navy">{t(locale, "kiosk.tapName")}</h2>
      <ul className="space-y-3">
        {view.roster.map((person) => (
          <li key={person.id}>
            <Link className="flex min-h-14 w-full items-center rounded-md bg-navy px-4 text-lg font-semibold text-white" href={`/k/${token}/w/${person.id}`}>
              {employeeName(person)}
            </Link>
          </li>
        ))}
      </ul>
      <Link className="flex min-h-14 w-full items-center justify-center rounded-md border border-line bg-white px-4 text-lg font-semibold text-navy" href={`/k/${token}/visitor`}>
        {t(locale, "kiosk.visitor")}
      </Link>
      <Link className="flex min-h-14 w-full items-center justify-center rounded-md border border-line bg-white px-4 text-lg font-semibold text-navy" href={`/k/${token}/paper`}>
        {t(locale, "kiosk.upload")}
      </Link>
    </KioskFrame>
  );
}
