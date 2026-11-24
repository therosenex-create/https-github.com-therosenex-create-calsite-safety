import Link from "next/link";
import { PageHeader, Pager, SelectField } from "@/components/fields";
import { StatusPill } from "@/components/status-pill";
import { t } from "@/lib/i18n";
import { getActor, getLocale } from "@/lib/session";
import { listProjectOptions, listTailgateCadence, listTailgates } from "@/lib/services/work";
import { tailgateTopicLabel } from "@/lib/tailgate-topics";
import { formatDateOnly } from "@/lib/time";

export default async function TailgatesPage({ searchParams }: { searchParams: Promise<{ page?: string; project?: string }> }) {
  const params = await searchParams;
  const [actor, locale] = await Promise.all([getActor(), getLocale()]);
  const projectId = params.project?.trim() || "";
  const [result, projects, cadence] = await Promise.all([
    listTailgates(actor, { page: params.page, projectId }),
    listProjectOptions(actor),
    listTailgateCadence(actor),
  ]);
  const pageHref = (page: number) => `/app/tailgates?page=${page}${projectId ? `&project=${projectId}` : ""}`;
  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader title={t(locale, "tailgate.title")} subtitle={t(locale, "tailgate.intro")} />
      </div>
      <p className="note mb-4">{t(locale, "sign.intro")}</p>
      <p className="note mb-4">{t(locale, "kiosk.legacyRoster")}</p>
      <section className="mb-6">
        <h2 className="font-serif text-2xl text-navy">{t(locale, "tailgate.cadence")}</h2>
        {cadence.length === 0 ? <p className="mt-2 text-sm text-muted">{t(locale, "dash.tailgateEmpty")}</p> : null}
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {cadence.map((row) => (
            <li key={row.id} className="card">
              <Link className="font-semibold text-navy underline" href={`/app/tailgates?project=${row.id}`}>
                {row.name}
              </Link>
              <p className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                <span>
                  {t(locale, "tailgate.last")}: {formatDateOnly(locale, row.lastAt)}
                </span>
                <StatusPill tone={row.cadence === "ON_TIME" ? "ok" : "due"}>{t(locale, `enum.TailgateCadence.${row.cadence}`)}</StatusPill>
              </p>
            </li>
          ))}
        </ul>
      </section>
      <form className="mb-4 flex flex-wrap items-end gap-2" action="/app/tailgates">
        <div className="min-w-56 flex-1">
          <SelectField label={t(locale, "tailgate.filter")} name="project" defaultValue={projectId}>
            <option value="">{t(locale, "fields.allProjects")}</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </SelectField>
        </div>
        <button className="btn-secondary" type="submit">
          {t(locale, "actions.filter")}
        </button>
      </form>
      {result.items.length === 0 ? <p className="text-sm text-muted">{t(locale, "empty.tailgates")}</p> : null}
      {result.items.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-line bg-white shadow-card">
          <table className="w-full min-w-[48rem] text-left text-sm">
            <thead className="bg-navy text-xs uppercase tracking-wide text-white">
              <tr>
                <th className="px-3 py-3 font-semibold">{t(locale, "fields.conductedOn")}</th>
                <th className="px-3 py-3 font-semibold">{t(locale, "fields.project")}</th>
                <th className="px-3 py-3 font-semibold">{t(locale, "tailgate.topic")}</th>
                <th className="px-3 py-3 font-semibold">{t(locale, "tailgate.role.conductor")}</th>
                <th className="px-3 py-3 font-semibold">{t(locale, "section.attendance")}</th>
                <th className="px-3 py-3 font-semibold">{t(locale, "fields.status")}</th>
              </tr>
            </thead>
            <tbody>
              {result.items.map((meeting) => (
                <tr key={meeting.id} className="border-t border-line align-top">
                  <td className="px-3 py-3 font-semibold text-amber">
                    <Link className="underline" href={`/app/meetings/${meeting.id}`}>
                      {formatDateOnly(locale, meeting.scheduledAt)}
                    </Link>
                  </td>
                  <td className="px-3 py-3 font-semibold text-navy">{meeting.project?.name ?? "—"}</td>
                  <td className="px-3 py-3">{tailgateTopicLabel(locale, meeting.requirementCode, meeting.topic)}</td>
                  <td className="px-3 py-3">{meeting.leaderName}</td>
                  <td className="px-3 py-3">
                    {meeting.signedCount} / {meeting.attendeeCount} {t(locale, "tailgate.signed")}
                  </td>
                  <td className="px-3 py-3">
                    <StatusPill tone={meeting.compliant ? "ok" : "due"}>
                      {t(locale, meeting.compliant ? "tailgate.compliant" : "tailgate.incomplete")}
                    </StatusPill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      <Pager page={result.page} total={result.total} pageSize={result.pageSize} previous={t(locale, "common.prev")} next={t(locale, "common.next")} hrefFor={pageHref} />
    </div>
  );
}
