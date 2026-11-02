import Link from "next/link";
import { t } from "@/lib/i18n";
import { formatDateOnly, formatPacific } from "@/lib/time";
import { getActor, getLocale } from "@/lib/session";
import { getDashboard, listOpenTasks } from "@/lib/services/work";

export default async function DashboardPage() {
  const [actor, locale] = await Promise.all([getActor(), getLocale()]);
  const [dash, tasks] = await Promise.all([getDashboard(actor), listOpenTasks(actor)]);
  const cards = [
    [dash.activeProjects, "dash.projects", "/app/projects"],
    [dash.unconfirmed, "dash.unconfirmed", "/app/projects"],
    [dash.openActions, "dash.actions", "/app/inspections"],
    [dash.imminent, "dash.imminent", "/app/inspections"],
    [dash.openIncidents, "dash.incidents", "/app/incidents"],
    [dash.openTasks, "dash.tasks", "/app"],
  ] as const;
  return (
    <div>
      <h1 className="font-serif text-3xl text-navy">{t(locale, "dash.queue")}</h1>
      <p className="mt-2 max-w-3xl text-sm text-muted">{t(locale, "common.score")}</p>
      {dash.imminent > 0 ? <p className="alert mt-4">{t(locale, "emergency")}</p> : null}
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(([count, key, href]) => (
          <Link key={key} href={href} className="card block">
            <p className="text-3xl font-semibold text-navy">{count}</p>
            <p className="mt-1 text-sm text-muted">{t(locale, key)}</p>
          </Link>
        ))}
      </div>
      <section className="mt-8">
        <h2 className="font-serif text-2xl text-navy">{t(locale, "dash.tasks")}</h2>
        <ul className="mt-3 space-y-2">
          {tasks.length === 0 ? <li className="text-sm text-muted">{t(locale, "common.none")}</li> : null}
          {tasks.map((task) => (
            <li key={task.id} className="card">
              <p className="font-semibold">{task.title}</p>
              <p className="text-sm text-muted">
                {task.project?.name ?? "—"} · {formatDateOnly(locale, task.dueAt)} · {t(locale, `enum.TaskBasis.${task.basis}`)}
              </p>
              <p className="text-sm">{task.basisNote}</p>
            </li>
          ))}
        </ul>
      </section>
      <section className="mt-8">
        <h2 className="font-serif text-2xl text-navy">{t(locale, "dash.meetings")}</h2>
        <ul className="mt-3 space-y-2">
          {dash.meetings.map((meeting) => (
            <li key={meeting.id}>
              <Link className="font-semibold text-navy underline" href={`/app/meetings/${meeting.id}`}>
                {meeting.title}
              </Link>
              <p className="text-sm text-muted">
                {formatPacific(locale, meeting.scheduledAt)} · {meeting.project?.name ?? "—"}
              </p>
            </li>
          ))}
        </ul>
      </section>
      <section className="mt-8">
        <h2 className="font-serif text-2xl text-navy">{t(locale, "dash.training")}</h2>
        <ul className="mt-3 space-y-2">
          {dash.trainings.map((record) => (
            <li key={record.id} className="text-sm">
              {record.topic} — {record.employee.firstName} {record.employee.lastName} · {formatDateOnly(locale, record.completedOn)}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
