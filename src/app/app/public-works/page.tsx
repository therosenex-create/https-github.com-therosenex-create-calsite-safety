import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { PageHeader, SelectField, TextArea, TextField } from "@/components/fields";
import { t } from "@/lib/i18n";
import { getActor, getLocale } from "@/lib/session";
import { getOrganization } from "@/lib/services/accounts";
import { listPayrollDrafts, listPublicWorks } from "@/lib/services/field-ops";
import { getCloseout } from "@/lib/services/local";
import { listDocuments, listProjectOptions } from "@/lib/services/work";
import { formatDateOnly, formatPacific } from "@/lib/time";
import { closeoutAction, payrollAction, publicWorksAction } from "@/server/actions";

export default async function PublicWorksPage({ searchParams }: { searchParams: Promise<{ project?: string }> }) {
  const params = await searchParams;
  const [actor, locale] = await Promise.all([getActor(), getLocale()]);
  const canWrite = actor.role !== "WORKER";
  const [org, records, drafts, projects, documents] = await Promise.all([
    getOrganization(actor),
    listPublicWorks(actor),
    listPayrollDrafts(actor),
    listProjectOptions(actor),
    canWrite ? listDocuments(actor) : Promise.resolve(null),
  ]);
  const closeout = params.project ? await getCloseout(actor, params.project).catch(() => null) : null;
  return (
    <div className="space-y-6">
      <PageHeader title={t(locale, "nav.publicWorks")} subtitle={t(locale, "pw.intro")} />
      <p className="note">{t(locale, "common.notLive")} {t(locale, "pw.noRates")}</p>
      <section className="card">
        <h2 className="font-serif text-2xl">{t(locale, "closeout.intro")}</h2>
        <ul className="mt-3 flex flex-wrap gap-2 text-sm">
          {projects.map((project) => (
            <li key={project.id}><Link className="underline" href={`/app/public-works?project=${project.id}`}>{project.name}</Link></li>
          ))}
        </ul>
        {closeout ? (
          <div>
            <p className="mt-3 text-sm"><Link className="underline" href={`/app/public-works/print?project=${params.project}`}>{t(locale, "actions.print")}</Link></p>
          <ul className="mt-4 space-y-4">
            {closeout.map((item) => (
              <li key={item.key} className="rounded-md border border-line p-3 text-sm">
                <p className="font-semibold">{t(locale, `enum.Closeout.${item.key}`)} · {item.complete ? t(locale, "yes") : t(locale, "no")}</p>
                {item.key === "PAYROLL_DRAFTS" ? <p className="text-muted">{item.draftCount} · {t(locale, "pw.notSubmitted")}</p> : null}
                {canWrite ? (
                  <div className="mt-2">
                    <ActionForm action={closeoutAction} submitLabel={t(locale, "actions.save")}>
                      <input type="hidden" name="projectId" value={params.project} />
                      <input type="hidden" name="itemKey" value={item.key} />
                      <TextArea label={t(locale, "fields.note")} name="note" defaultValue={item.note} />
                      <SelectField label={t(locale, "fields.file")} name="documentId">
                        <option value="">—</option>
                        {documents?.items.map((document) => <option key={document.id} value={document.id}>{document.title}</option>)}
                      </SelectField>
                      {item.key === "SIGNOFF" ? (
                        <>
                          <TextField label={t(locale, "fields.signoffName")} name="signoffName" defaultValue={item.signoffName} />
                          <label className="flex min-h-11 items-start gap-3 text-sm">
                            <input type="checkbox" name="acknowledgedNotASignature" value="yes" />
                            <span>{t(locale, "closeout.notSignature")}</span>
                          </label>
                        </>
                      ) : null}
                    </ActionForm>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
          </div>
        ) : null}
      </section>
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
