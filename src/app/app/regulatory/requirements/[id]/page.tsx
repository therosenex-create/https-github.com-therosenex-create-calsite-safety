import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { EnumOptions, SelectField, TextArea, TextField } from "@/components/fields";
import { isAppError } from "@/lib/errors";
import { t } from "@/lib/i18n";
import { getActor, getLocale } from "@/lib/session";
import { getRequirement, listEvidenceForRequirement } from "@/lib/services/regulatory";
import { listDocuments, listInspections, listMeetings, listProjectOptions, listTraining } from "@/lib/services/work";
import { assignRequirementAction, linkEvidenceAction } from "@/server/actions";

const states = ["APPLICABLE", "POTENTIALLY_APPLICABLE", "NOT_APPLICABLE", "CONTRACTUALLY_REQUIRED", "RECOMMENDED_PRACTICE", "PENDING_QUALIFIED_REVIEW", "SUPERSEDED", "VERIFICATION_OVERDUE"] as const;

export default async function RequirementDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [actor, locale] = await Promise.all([getActor(), getLocale()]);
  const requirement = await getRequirement(id).catch((error) => {
    if (isAppError(error) && error.code === "not_found") notFound();
    throw error;
  });
  const canWrite = actor.role !== "WORKER";
  const [projects, evidence, documents, inspections, meetings, training] = await Promise.all([
    listProjectOptions(actor),
    listEvidenceForRequirement(actor, requirement.id),
    canWrite ? listDocuments(actor) : Promise.resolve(null),
    canWrite ? listInspections(actor) : Promise.resolve(null),
    canWrite ? listMeetings(actor) : Promise.resolve(null),
    canWrite ? listTraining(actor) : Promise.resolve(null),
  ]);
  const records = {
    document: documents?.items ?? [],
    inspection: inspections?.items ?? [],
    meeting: meetings?.items ?? [],
    training: training?.items ?? [],
  };
  return (
    <div className="space-y-5">
      <p className="text-sm"><Link href="/app/regulatory">{t(locale, "nav.requirements")}</Link></p>
      <h1 className="font-serif text-3xl text-navy">{requirement.title}</h1>
      <p className="text-sm">{requirement.citation} · {requirement.code}</p>
      <p className="note">{t(locale, "banner")}</p>
      <p className="text-sm leading-6">{locale === "es" ? requirement.plainLanguageEs : requirement.plainLanguageEn}</p>
      {locale === "es" ? <p className="text-sm text-muted">Resumen en español no oficial. Manda el texto en inglés del Título 8.</p> : null}
      {requirement.officialExcerpt ? (
        <blockquote className="border-l-4 border-navy pl-3 text-sm">
          <p>{requirement.officialExcerpt}</p>
          <p className="mt-1 text-muted">{t(locale, "meta.partialExcerpt")}</p>
        </blockquote>
      ) : null}
      <dl className="card grid gap-3 text-sm">
        <div><dt className="font-semibold">Scope</dt><dd>{requirement.scope}</dd></div>
        <div><dt className="font-semibold">Activity</dt><dd>{requirement.activity}</dd></div>
        <div><dt className="font-semibold">Responsible party</dt><dd>{requirement.responsibleParty}</dd></div>
        <div><dt className="font-semibold">Trigger</dt><dd>{requirement.deadlineOrTrigger}</dd></div>
        <div><dd>{requirement.deadlineVerified ? t(locale, "meta.triggerChecked") : t(locale, "meta.triggerUnchecked")}</dd></div>
        <div><dd>{t(locale, "meta.noConsequences")}</dd></div>
        <div><dt className="font-semibold">{t(locale, "fields.status")}</dt><dd>{t(locale, `enum.ReviewStatus.${requirement.reviewStatus}`)}</dd></div>
        <div><dt className="font-semibold">Source</dt><dd><Link className="underline" href={`/app/regulatory/sources/${requirement.sourceId}`}>{requirement.source.title}</Link></dd></div>
        <div><dd><a className="underline" href={requirement.source.officialUrl}>{requirement.source.officialUrl}</a></dd></div>
      </dl>
      <p className="note">{requirement.limitations}</p>
      {requirement.exceptions.length ? (
        <section>
          <h2 className="font-serif text-2xl">Exceptions noted</h2>
          <ul className="mt-2 list-disc pl-5 text-sm">{requirement.exceptions.map((item) => <li key={item.id}>{item.description}</li>)}</ul>
        </section>
      ) : null}
      {requirement.evidenceTypes.length ? (
        <section>
          <h2 className="font-serif text-2xl">{t(locale, "section.evidence")}</h2>
          <ul className="mt-2 list-disc pl-5 text-sm">{requirement.evidenceTypes.map((item) => <li key={item.id}>{item.name}: {item.description}</li>)}</ul>
        </section>
      ) : null}
      <section className="card">
        <h2 className="font-serif text-2xl">{t(locale, "section.evidence")}</h2>
        <ul className="mt-2 space-y-2 text-sm">
          {evidence.length === 0 ? <li>{t(locale, "common.none")}</li> : null}
          {evidence.map((link) => (
            <li key={link.id}>{t(locale, `enum.EvidenceLinkStatus.${link.status}`)} — {link.note}</li>
          ))}
        </ul>
        <p className="hint">{t(locale, "evidence.warn")}</p>
      </section>
      {canWrite ? (
        <>
          <section className="card">
            <h2 className="font-serif text-2xl">{t(locale, "actions.assign")}</h2>
            <p className="note mt-2">{t(locale, "assign.warn")}</p>
            <div className="mt-3">
              <ActionForm action={assignRequirementAction} submitLabel={t(locale, "actions.assign")}>
                <input type="hidden" name="requirementId" value={requirement.id} />
                <SelectField label={t(locale, "fields.project")} name="projectId">
                  <option value="">Company-wide</option>
                  {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
                </SelectField>
                <SelectField label={t(locale, "fields.applicability")} name="applicability" defaultValue="PENDING_QUALIFIED_REVIEW">
                  <EnumOptions locale={locale} group="ApplicabilityState" values={states} />
                </SelectField>
                <TextArea label={t(locale, "fields.rationale")} name="rationale" required />
                <TextField label={t(locale, "fields.responsibleRole")} name="responsibleRole" />
              </ActionForm>
            </div>
          </section>
          <section className="card">
            <h2 className="font-serif text-2xl">{t(locale, "actions.linkEvidence")}</h2>
            <div className="mt-3">
              <ActionForm action={linkEvidenceAction} submitLabel={t(locale, "actions.linkEvidence")}>
                <input type="hidden" name="requirementId" value={requirement.id} />
                <input type="hidden" name="projectId" value="" />
                <SelectField label={t(locale, "fields.recordKind")} name="recordKind" defaultValue="document">
                  <option value="document">{t(locale, "nav.files")}</option>
                  <option value="inspection">{t(locale, "nav.inspections")}</option>
                  <option value="meeting">{t(locale, "nav.meetings")}</option>
                  <option value="training">{t(locale, "nav.training")}</option>
                </SelectField>
                <SelectField label={t(locale, "fields.recordId")} name="recordId">
                  {records.document.map((item) => <option key={item.id} value={item.id}>File: {item.title}</option>)}
                  {records.inspection.map((item) => <option key={item.id} value={item.id}>Inspection: {item.project.name}</option>)}
                  {records.meeting.map((item) => <option key={item.id} value={item.id}>Meeting: {item.title}</option>)}
                  {records.training.map((item) => <option key={item.id} value={item.id}>Training: {item.topic}</option>)}
                </SelectField>
                <SelectField label={t(locale, "fields.status")} name="status" defaultValue="UPLOADED">
                  <EnumOptions locale={locale} group="EvidenceLinkStatus" values={["UPLOADED", "REVIEWED", "APPROVED", "COMPLETED"]} />
                </SelectField>
                <TextArea label={t(locale, "fields.note")} name="note" required />
              </ActionForm>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
