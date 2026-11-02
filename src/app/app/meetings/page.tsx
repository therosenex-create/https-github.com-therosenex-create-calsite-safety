import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { EnumOptions, PageHeader, Pager, SelectField, TextArea, TextField } from "@/components/fields";
import { t } from "@/lib/i18n";
import { getActor, getLocale } from "@/lib/session";
import { listMeetings, listProjectOptions } from "@/lib/services/work";
import { formatPacific } from "@/lib/time";
import { createMeetingAction } from "@/server/actions";

export default async function MeetingsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const params = await searchParams;
  const [actor, locale] = await Promise.all([getActor(), getLocale()]);
  const [result, projects] = await Promise.all([
    listMeetings(actor, { page: params.page }),
    actor.role === "WORKER" ? Promise.resolve([]) : listProjectOptions(actor),
  ]);
  return (
    <div>
      <PageHeader title={t(locale, "nav.meetings")} subtitle={t(locale, "hints.policy")} />
      <p className="mb-4 text-sm">
        <Link className="font-semibold text-navy underline" href="/app/tailgates">{t(locale, "tailgate.log")} · § 1509</Link>
      </p>
      <ul className="space-y-3">
        {result.items.length === 0 ? <li className="text-sm text-muted">{t(locale, "empty.meetings")}</li> : null}
        {result.items.map((meeting) => (
          <li key={meeting.id} className="card">
            <Link className="font-semibold text-navy underline" href={`/app/meetings/${meeting.id}`}>{meeting.title}</Link>
            <p className="text-sm text-muted">{formatPacific(locale, meeting.scheduledAt)} · {meeting.project?.name ?? "—"} · {meeting._count.attendance}{meeting.meetingKind === "TAILGATE" ? ` · ${t(locale, "nav.tailgates")}` : ""}</p>
            <p className="text-sm">{t(locale, `enum.PolicyBasis.${meeting.policyBasis}`)}</p>
          </li>
        ))}
      </ul>
      <Pager page={result.page} total={result.total} pageSize={result.pageSize} previous={t(locale, "common.prev")} next={t(locale, "common.next")} hrefFor={(page) => `/app/meetings?page=${page}`} />
      {actor.role !== "WORKER" ? (
        <details className="card mt-6">
          <summary className="cursor-pointer text-lg font-semibold">{t(locale, "actions.create")}</summary>
          <div className="mt-4">
            <ActionForm action={createMeetingAction} submitLabel={t(locale, "actions.create")}>
              <SelectField label={t(locale, "fields.project")} name="projectId">
                <option value="">—</option>
                {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
              </SelectField>
              <TextField label={t(locale, "fields.title")} name="title" required />
              <TextField label={t(locale, "fields.topic")} name="topic" required />
              <SelectField label={t(locale, "fields.language")} name="language" defaultValue="en">
                <option value="en">English</option>
                <option value="es">Español</option>
              </SelectField>
              <TextField label={t(locale, "fields.scheduledAt")} name="scheduledAt" type="datetime-local" required hint={t(locale, "common.pacific")} />
              <TextField label={t(locale, "fields.leaderName")} name="leaderName" required />
              <SelectField label={t(locale, "fields.policyBasis")} name="policyBasis" defaultValue="COMPANY_POLICY" hint={t(locale, "hints.policy")}>
                <EnumOptions locale={locale} group="PolicyBasis" values={["COMPANY_POLICY", "CONTRACT_REQUIREMENT", "RECORDED_AGAINST_CITATION"]} />
              </SelectField>
              <TextField label={t(locale, "fields.requirementCode")} name="requirementCode" />
              <TextArea label={t(locale, "fields.discussionPoints")} name="discussionPoints" />
              <TextArea label={t(locale, "fields.workerQuestions")} name="workerQuestions" />
              <TextArea label={t(locale, "fields.followUp")} name="followUp" />
              <TextArea label={t(locale, "fields.notes")} name="notes" />
              <SelectField label={t(locale, "fields.status")} name="status" defaultValue="SCHEDULED">
                <EnumOptions locale={locale} group="MeetingStatus" values={["SCHEDULED", "COMPLETE"]} />
              </SelectField>
            </ActionForm>
          </div>
        </details>
      ) : null}
    </div>
  );
}
