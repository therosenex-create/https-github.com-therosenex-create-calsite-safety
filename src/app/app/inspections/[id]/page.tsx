import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { EnumOptions, SelectField, TextArea, TextField } from "@/components/fields";
import { promptsFor } from "@/lib/checklists";
import { isAppError } from "@/lib/errors";
import { t } from "@/lib/i18n";
import { getActor, getLocale } from "@/lib/session";
import { getInspection, listProjectOptions } from "@/lib/services/work";
import { formatDateOnly, utcToPacificInput } from "@/lib/time";
import { INSPECTION_CATEGORIES } from "@/lib/checklists";
import {
  archiveInspectionAction,
  checklistAction,
  correctiveActionCreate,
  correctiveActionUpdate,
  findingAction,
  findingStatusAction,
  updateInspectionAction,
} from "@/server/actions";

type Answer = { key?: string; result?: string; note?: string };

export default async function InspectionDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [actor, locale] = await Promise.all([getActor(), getLocale()]);
  const inspection = await getInspection(actor, id).catch((error) => {
    if (isAppError(error) && error.code === "not_found") notFound();
    throw error;
  });
  const canWrite = actor.role !== "WORKER";
  const projects = canWrite ? await listProjectOptions(actor) : [];
  const prompts = promptsFor(inspection.category);
  const saved = Array.isArray(inspection.checklist) ? (inspection.checklist as Answer[]) : [];
  const byKey = new Map(saved.map((item) => [item.key, item]));
  const imminent = inspection.findings.some((finding) => finding.severity === "IMMINENT_DANGER" && finding.status === "OPEN");
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm"><Link href="/app/inspections">{t(locale, "nav.inspections")}</Link></p>
        <h1 className="font-serif text-3xl text-navy">{t(locale, `enum.category.${inspection.category}`)}</h1>
        <p className="mt-2 text-sm"><Link className="underline" href={`/app/inspections/${inspection.id}/print`}>{t(locale, "actions.print")}</Link></p>
        <p className="text-sm text-muted">{inspection.project.name} · {inspection.inspectorName}</p>
        {imminent ? <p className="alert mt-3">{t(locale, "emergency")}</p> : null}
        <p className="note mt-3">{t(locale, "common.guidance")}</p>
      </div>
      <section className="card">
        <h2 className="font-serif text-2xl">{t(locale, "section.checklist")}</h2>
        <p className="hint">{t(locale, "hints.checklist")}</p>
        {canWrite ? (
          <div className="mt-4">
            <ActionForm action={checklistAction.bind(null, inspection.id)} submitLabel={t(locale, "actions.save")}>
              {prompts.map((prompt) => {
                const current = byKey.get(prompt.key);
                return (
                  <fieldset key={prompt.key} className="rounded-md border border-line p-3">
                    <legend className="px-1 text-sm font-semibold">{locale === "es" ? prompt.es : prompt.en}</legend>
                    <select className="input" name={`result_${prompt.key}`} defaultValue={current?.result ?? "UNANSWERED"}>
                      <EnumOptions locale={locale} group="check" values={["UNANSWERED", "YES", "NO", "NA"]} />
                    </select>
                    <input className="input" name={`note_${prompt.key}`} defaultValue={current?.note ?? ""} />
                  </fieldset>
                );
              })}
            </ActionForm>
          </div>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {prompts.map((prompt) => (
              <li key={prompt.key}>{locale === "es" ? prompt.es : prompt.en} — {byKey.get(prompt.key)?.result ?? "UNANSWERED"}</li>
            ))}
          </ul>
        )}
      </section>
      <section className="space-y-4">
        <h2 className="font-serif text-2xl">{t(locale, "section.findings")}</h2>
        {inspection.findings.map((finding) => (
          <article key={finding.id} className="card">
            <p className="font-semibold">{finding.description}</p>
            <p className="text-sm">{t(locale, `enum.Severity.${finding.severity}`)} · {t(locale, `enum.FindingStatus.${finding.status}`)}</p>
            {finding.severity === "IMMINENT_DANGER" ? <p className="alert mt-2">{t(locale, "emergency")}</p> : null}
            {finding.immediateAction ? <p className="mt-2 text-sm">{finding.immediateAction}</p> : null}
            {canWrite ? (
              <div className="mt-3 flex gap-2">
                <form action={findingStatusAction.bind(null, inspection.id, finding.id, "CORRECTED")}>
                  <button className="btn-secondary" type="submit">{t(locale, "enum.FindingStatus.CORRECTED")}</button>
                </form>
                <form action={findingStatusAction.bind(null, inspection.id, finding.id, "OPEN")}>
                  <button className="btn-secondary" type="submit">{t(locale, "enum.FindingStatus.OPEN")}</button>
                </form>
              </div>
            ) : null}
            <h3 className="mt-4 font-semibold">{t(locale, "section.actions")}</h3>
            <ul className="mt-2 space-y-3">
              {finding.correctiveActions.map((action) => (
                <li key={action.id} className="rounded-md border border-line p-3 text-sm">
                  <p>{action.description}</p>
                  <p className="text-muted">{action.responsibleName} · {formatDateOnly(locale, action.dueDate)} · {t(locale, `enum.ActionStatus.${action.status}`)}</p>
                  <p className="hint">{t(locale, "hints.due")}</p>
                  {canWrite ? (
                    <div className="mt-2">
                      <ActionForm action={correctiveActionUpdate.bind(null, inspection.id, finding.id, action.id)} submitLabel={t(locale, "actions.save")} secondary>
                        <TextArea label={t(locale, "fields.description")} name="description" required defaultValue={action.description} />
                        <TextField label={t(locale, "fields.responsibleName")} name="responsibleName" required defaultValue={action.responsibleName} />
                        <TextField label={t(locale, "fields.dueDate")} name="dueDate" type="date" defaultValue={action.dueDate ? action.dueDate.toISOString().slice(0, 10) : ""} hint={t(locale, "hints.due")} />
                        <TextArea label={t(locale, "fields.evidenceNote")} name="evidenceNote" defaultValue={action.evidenceNote} />
                        <SelectField label={t(locale, "fields.status")} name="status" defaultValue={action.status}>
                          <EnumOptions locale={locale} group="ActionStatus" values={["OPEN", "COMPLETE"]} />
                        </SelectField>
                      </ActionForm>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
            {canWrite ? (
              <div className="mt-3">
                <ActionForm action={correctiveActionCreate.bind(null, inspection.id, finding.id)} submitLabel={t(locale, "actions.add")}>
                  <TextArea label={t(locale, "fields.description")} name="description" required />
                  <TextField label={t(locale, "fields.responsibleName")} name="responsibleName" required />
                  <TextField label={t(locale, "fields.dueDate")} name="dueDate" type="date" hint={t(locale, "hints.due")} />
                  <TextArea label={t(locale, "fields.evidenceNote")} name="evidenceNote" />
                  <SelectField label={t(locale, "fields.status")} name="status" defaultValue="OPEN">
                    <EnumOptions locale={locale} group="ActionStatus" values={["OPEN", "COMPLETE"]} />
                  </SelectField>
                </ActionForm>
              </div>
            ) : null}
          </article>
        ))}
        {canWrite ? (
          <div className="card">
            <h3 className="font-semibold">{t(locale, "actions.add")}</h3>
            <div className="mt-3">
              <ActionForm action={findingAction.bind(null, inspection.id)} submitLabel={t(locale, "actions.add")}>
                <TextArea label={t(locale, "fields.description")} name="description" required />
                <SelectField label={t(locale, "fields.severity")} name="severity" defaultValue="MEDIUM">
                  <EnumOptions locale={locale} group="Severity" values={["LOW", "MEDIUM", "HIGH", "IMMINENT_DANGER"]} />
                </SelectField>
                <TextArea label={t(locale, "fields.immediateAction")} name="immediateAction" />
              </ActionForm>
            </div>
          </div>
        ) : null}
      </section>
      {canWrite ? (
        <section className="card">
          <ActionForm action={updateInspectionAction.bind(null, inspection.id)} submitLabel={t(locale, "actions.save")}>
            <SelectField label={t(locale, "fields.project")} name="projectId" defaultValue={inspection.projectId}>
              {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </SelectField>
            <SelectField label={t(locale, "fields.category")} name="category" defaultValue={inspection.category}>
              <EnumOptions locale={locale} group="category" values={INSPECTION_CATEGORIES} />
            </SelectField>
            <TextField label={t(locale, "fields.inspectedAt")} name="inspectedAt" type="datetime-local" required defaultValue={utcToPacificInput(inspection.inspectedAt)} />
            <TextField label={t(locale, "fields.inspectorName")} name="inspectorName" required defaultValue={inspection.inspectorName} />
            <TextField label={t(locale, "fields.location")} name="location" defaultValue={inspection.location} />
            <TextArea label={t(locale, "fields.summary")} name="summary" required defaultValue={inspection.summary} />
            <SelectField label={t(locale, "fields.status")} name="status" defaultValue={inspection.status === "ARCHIVED" ? "CLOSED" : inspection.status}>
              <EnumOptions locale={locale} group="InspectionStatus" values={["OPEN", "CLOSED"]} />
            </SelectField>
          </ActionForm>
          <form className="mt-4" action={archiveInspectionAction.bind(null, inspection.id)}>
            <button className="btn-secondary" type="submit">{t(locale, "actions.archive")}</button>
          </form>
        </section>
      ) : null}
    </div>
  );
}
