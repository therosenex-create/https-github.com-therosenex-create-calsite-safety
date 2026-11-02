import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { PageHeader, SelectField, TextArea, TextField } from "@/components/fields";
import { t } from "@/lib/i18n";
import { getActor, getLocale } from "@/lib/session";
import { getOrganization } from "@/lib/services/accounts";
import { listPayrollDrafts, listPublicWorks } from "@/lib/services/field-ops";
import { listDocuments, listProjectOptions } from "@/lib/services/work";
import { formatDateOnly, formatPacific } from "@/lib/time";
import { payrollAction, publicWorksAction } from "@/server/actions";

export default async function PublicWorksPage() {
  const [actor, locale] = await Promise.all([getActor(), getLocale()]);
  const canWrite = actor.role !== "WORKER";
  const [org, records, drafts, projects, documents] = await Promise.all([
    getOrganization(actor),
    listPublicWorks(actor),
    listPayrollDrafts(actor),
    canWrite ? listProjectOptions(actor) : Promise.resolve([]),
    canWrite ? listDocuments(actor) : Promise.resolve(null),
  ]);
  return (
    <div className="space-y-6">
      <PageHeader title={t(locale, "nav.publicWorks")} subtitle={t(locale, "pw.intro")} />
      <p className="note">{t(locale, "common.notLive")} {t(locale, "pw.noRates")}</p>
      <section className="card text-sm">
        <p>DIR {org.organization.dirRegistrationNumber ?? "—"} · {t(locale, `enum.VerificationStatus.${org.organization.dirVerificationStatus}`)}</p>
        <p className="mt-2"><Link className="underline" href="/app/licensing">{t(locale, "nav.licensing")}</Link></p>
      </section>
      <ul className="space-y-3">
        {records.length === 0 ? <li className="text-sm text-muted">{t(locale, "common.none")}</li> : null}
        {records.map((record) => (
          <li key={record.id} className="card text-sm">
            <p className="font-semibold">{record.project.name} · {record.awardingBody}</p>
            <p className="text-muted">{formatPacific(locale, record.registrationCheckedAt)} · {t(locale, `enum.PublicWorksStatus.${record.project.publicWorksStatus}`)}</p>
            <p className="mt-2">{record.registrationEvidenceNote}</p>
            <p className="mt-2">{t(locale, "fields.determinationId")}: {record.wageDeterminationId ?? "—"}</p>
            <p>{record.wageNote}</p>
            <p className="mt-2">{record.apprenticeshipCraft ?? "—"} · {record.apprenticeshipNote}</p>
          </li>
        ))}
      </ul>
      <section>
        <h2 className="font-serif text-2xl">{t(locale, "fields.weekEnding")}</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {drafts.map((draft) => (
            <li key={draft.id} className="card">
              <p className="font-semibold">{draft.project.name} · {formatDateOnly(locale, draft.weekEnding)}</p>
              <p>{t(locale, "pw.notSubmitted")}</p>
              <p>{draft.note}</p>
            </li>
          ))}
        </ul>
      </section>
      {canWrite ? (
        <>
          <section className="card">
            <ActionForm action={publicWorksAction} submitLabel={t(locale, "actions.save")}>
              <SelectField label={t(locale, "fields.project")} name="projectId">
                {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
              </SelectField>
              <TextField label={t(locale, "fields.awardingBody")} name="awardingBody" required />
              <TextArea label={t(locale, "fields.registrationNote")} name="registrationEvidenceNote" required hint={t(locale, "common.notLive")} />
              <SelectField label={t(locale, "fields.file")} name="registrationDocumentId">
                <option value="">—</option>
                {documents?.items.map((document) => <option key={document.id} value={document.id}>{document.title}</option>)}
              </SelectField>
              <TextField label={t(locale, "fields.determinationId")} name="wageDeterminationId" hint={t(locale, "pw.noRates")} />
              <TextArea label={t(locale, "fields.wageNote")} name="wageNote" required />
              <TextField label={t(locale, "fields.craft")} name="apprenticeshipCraft" />
              <TextArea label={t(locale, "fields.apprenticeshipNote")} name="apprenticeshipNote" />
            </ActionForm>
          </section>
          <section className="card">
            <ActionForm action={payrollAction} submitLabel={t(locale, "actions.save")}>
              <SelectField label={t(locale, "fields.project")} name="projectId">
                {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
              </SelectField>
              <TextField label={t(locale, "fields.weekEnding")} name="weekEnding" type="date" required />
              <TextArea label={t(locale, "fields.note")} name="note" required hint={t(locale, "pw.notSubmitted")} />
            </ActionForm>
          </section>
        </>
      ) : null}
    </div>
  );
}
