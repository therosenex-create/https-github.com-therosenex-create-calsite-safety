import Link from "next/link";
import { notFound } from "next/navigation";
import { t } from "@/lib/i18n";
import { getActor, getLocale } from "@/lib/session";
import { listAudit } from "@/lib/services/regulatory";
import { formatPacific } from "@/lib/time";
import { isAppError } from "@/lib/errors";

export default async function AuditPage() {
  const [actor, locale] = await Promise.all([getActor(), getLocale()]);
  if (actor.role !== "ADMIN") notFound();
  const events = await listAudit(actor).catch((error) => {
    if (isAppError(error)) notFound();
    throw error;
  });
  return (
    <div>
      <p className="text-sm"><Link href="/app/settings">{t(locale, "nav.settings")}</Link></p>
      <h1 className="font-serif text-3xl text-navy">{t(locale, "nav.audit")}</h1>
      <p className="mt-2 text-sm text-muted">Admins can read this log. They cannot edit past events in the app.</p>
      <ul className="mt-4 space-y-2 text-sm">
        {events.map((event) => (
          <li key={event.id} className="card">
            <p className="font-semibold">{event.action} · {event.entityType}</p>
            <p className="text-muted">{formatPacific(locale, event.createdAt)} · {event.actor.name} · {t(locale, `enum.MembershipRole.${event.actorRole}`)}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
