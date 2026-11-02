import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { EnumOptions, SelectField, TextArea, TextField } from "@/components/fields";
import { isAppError } from "@/lib/errors";
import { t } from "@/lib/i18n";
import { getActor, getLocale } from "@/lib/session";
import { getMeeting, listEmployeeOptions, listProjectOptions } from "@/lib/services/work";
import { formatPacific, utcToPacificInput } from "@/lib/time";
import { acknowledgeAction, archiveMeetingAction, attendanceAction, updateMeetingAction } from "@/server/actions";

export default async function MeetingDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [actor, locale] = await Promise.all([getActor(), getLocale()]);
  const meeting = await getMeeting(actor, id).catch((error) => {
    if (isAppError(error) && error.code === "not_found") notFound();
    throw error;
  });
  const canWrite = actor.role !== "WORKER";
  const [people, projects] = canWrite ? await Promise.all([listEmployeeOptions(actor), listProjectOptions(actor)]) : [[], []];
  const present = new Set(meeting.attendance.filter((row) => row.present).map((row) => row.employeeId));
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm"><Link href="/app/meetings">{t(locale, "nav.meetings")}</Link></p>
        <h1 className="font-serif text-3xl text-navy">{meeting.title}</h1>
        <p className="mt-2 text-sm"><Link className="underline" href={`/app/meetings/${meeting.id}/print`}>{t(locale, "actions.print")}</Link></p>
        <p className="text-sm text-muted">{formatPacific(locale, meeting.scheduledAt)} · {meeting.leaderName}</p>
        <p className="mt-2 text-sm">{t(locale, `enum.PolicyBasis.${meeting.policyBasis}`)}</p>
        {meeting.requirementCode ? <p className="text-sm">Code: {meeting.requirementCode}</p> : null}
        <p className="note mt-3">{t(locale, "common.checkbox")}</p>
        <p className="mt-3"><Link className="underline" href={`/app/meetings/${meeting.id}/print`}>{t(locale, "actions.print")}</Link></p>
      </div>
      <section className="card">
        <h2 className="font-serif text-2xl">{t(locale, "section.attendance")}</h2>
        <form className="mt-3" action={acknowledgeAction.bind(null, meeting.id)}>
          <button className="btn" type="submit">{t(locale, "actions.acknowledge")}</button>
          <p className="hint">{t(locale, "hints.attendanceSelf")}</p>
        </form>
        {canWrite ? (
          <div className="mt-4">
            <ActionForm action={attendanceAction.bind(null, meeting.id)} submitLabel={t(locale, "actions.save")}>
              <fieldset className="space-y-2">
                <legend className="label">{t(locale, "section.attendance")}</legend>
                {people.map((person) => (
                  <label key={person.id} className="flex min-h-11 items-center gap-3 text-sm">
                    <input type="checkbox" name="employeeId" value={person.id} defaultChecked={present.has(person.id)} />
                    {person.lastName}, {person.firstName}
                  </label>
                ))}
              </fieldset>
            </ActionForm>
          </div>
        ) : (
          <ul className="mt-3 text-sm">
            {meeting.attendance.map((row) => (
              <li key={row.id}>{row.employee.firstName} {row.employee.lastName}</li>
            ))}
          </ul>
        )}
      </section>
      {canWrite ? (
        <section className="card">
          <ActionForm action={updateMeetingAction.bind(null, meeting.id)} submitLabel={t(locale, "actions.save")}>
            <SelectField label={t(locale, "fields.project")} name="projectId" defaultValue={meeting.projectId ?? ""}>
              <option value="">—</option>
              {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </SelectField>
            <TextField label={t(locale, "fields.title")} name="title" required defaultValue={meeting.title} />
            <TextField label={t(locale, "fields.topic")} name="topic" required defaultValue={meeting.topic} />
            <SelectField label={t(locale, "fields.language")} name="language" defaultValue={meeting.language}>
              <option value="en">English</option>
              <option value="es">Español</option>
            </SelectField>
            <TextField label={t(locale, "fields.scheduledAt")} name="scheduledAt" type="datetime-local" required defaultValue={utcToPacificInput(meeting.scheduledAt)} hint={t(locale, "common.pacific")} />
            <TextField label={t(locale, "fields.leaderName")} name="leaderName" required defaultValue={meeting.leaderName} />
            <SelectField label={t(locale, "fields.policyBasis")} name="policyBasis" defaultValue={meeting.policyBasis}>
              <EnumOptions locale={locale} group="PolicyBasis" values={["COMPANY_POLICY", "CONTRACT_REQUIREMENT", "RECORDED_AGAINST_CITATION"]} />
            </SelectField>
            <TextField label={t(locale, "fields.requirementCode")} name="requirementCode" defaultValue={meeting.requirementCode} />
            <TextArea label={t(locale, "fields.discussionPoints")} name="discussionPoints" defaultValue={meeting.discussionPoints} />
            <TextArea label={t(locale, "fields.workerQuestions")} name="workerQuestions" defaultValue={meeting.workerQuestions} />
            <TextArea label={t(locale, "fields.followUp")} name="followUp" defaultValue={meeting.followUp} />
            <TextArea label={t(locale, "fields.notes")} name="notes" defaultValue={meeting.notes} />
            <SelectField label={t(locale, "fields.status")} name="status" defaultValue={meeting.status === "ARCHIVED" ? "COMPLETE" : meeting.status}>
              <EnumOptions locale={locale} group="MeetingStatus" values={["SCHEDULED", "COMPLETE"]} />
            </SelectField>
          </ActionForm>
          <form className="mt-4" action={archiveMeetingAction.bind(null, meeting.id)}>
            <button className="btn-secondary" type="submit">{t(locale, "actions.archive")}</button>
          </form>
        </section>
      ) : (
        <section className="card text-sm">
          <p>{meeting.discussionPoints}</p>
          <p className="mt-2">{meeting.notes}</p>
        </section>
      )}
    </div>
  );
}
