import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { EnumOptions, PageHeader, SelectField, TextArea, TextField } from "@/components/fields";
import { t } from "@/lib/i18n";
import { getActor, getLocale } from "@/lib/session";
import { listContractDocuments, listContractFileOptions } from "@/lib/services/contracts";
import { listProjectOptions } from "@/lib/services/work";
import { formatDateOnly } from "@/lib/time";
import { contractDocumentAction, contractImpactAction } from "@/server/actions";

const types = ["RFP_RFQ", "PRIME", "SUBCONTRACT", "ADDENDUM", "SPECS", "OTHER"] as const;

export default async function ContractsPage({ searchParams }: { searchParams: Promise<{ project?: string }> }) {
  const params = await searchParams;
  const [actor, locale] = await Promise.all([getActor(), getLocale()]);
  const canWrite = actor.role !== "WORKER";
  const [listed, projects, files] = await Promise.all([
    listContractDocuments(actor),
    canWrite ? listProjectOptions(actor) : Promise.resolve([]),
    canWrite ? listContractFileOptions(actor) : Promise.resolve([]),
  ]);
  const documents = params.project ? listed.documents.filter((document) => document.projectId === params.project) : listed.documents;
  const impact = params.project ? listed.impact.filter((item) => item.projectId === params.project) : listed.impact;
  return (
    <div>
      <PageHeader title={t(locale, "nav.contracts")} subtitle={t(locale, "contract.intro")} />
      {impact.map((item) => (
        <section key={item.contractDocumentId} className="note mb-4">
          <p className="font-semibold">{item.projectName} · {item.title}</p>
          <p className="mt-2">{t(locale, "contract.impact")}</p>
          <ul className="mt-2 list-disc pl-5 text-sm">
            {item.openTasks.length === 0 ? <li>{t(locale, "common.none")}</li> : null}
            {item.openTasks.map((task) => <li key={task.id}>{task.title}</li>)}
          </ul>
          {canWrite ? (
            <div className="mt-3">
              <ActionForm action={contractImpactAction} submitLabel={t(locale, "actions.save")}>
                <input type="hidden" name="contractDocumentId" value={item.contractDocumentId} />
                <TextArea label={t(locale, "fields.note")} name="note" required hint={t(locale, "contract.impact")} />
              </ActionForm>
            </div>
          ) : null}
        </section>
      ))}
      <ul className="space-y-3">
        {documents.length === 0 ? <li className="text-sm text-muted">{t(locale, "common.none")}</li> : null}
        {documents.map((document) => (
          <li key={document.id} className="card text-sm">
            <Link className="font-semibold underline" href={`/app/contracts/${document.id}`}>{document.title}</Link>
            <p className="text-muted">{document.project.name} · {t(locale, `enum.ContractType.${document.docType}`)} · {document.revisionLabel ?? "—"}</p>
            <p>{document.parties}</p>
            <p className="text-muted">{formatDateOnly(locale, document.receivedOn)} · {document.drafts.filter((draft) => draft.status === "DRAFT").length} {t(locale, "enum.ContractDraft.DRAFT")}</p>
          </li>
        ))}
      </ul>
      {canWrite ? (
        <div className="card mt-6">
          <ActionForm action={contractDocumentAction} submitLabel={t(locale, "actions.save")} multipart>
            <SelectField label={t(locale, "fields.project")} name="projectId" defaultValue={params.project}>
              {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </SelectField>
            <SelectField label={t(locale, "fields.category")} name="docType" defaultValue="OTHER">
              <EnumOptions locale={locale} group="ContractType" values={types} />
            </SelectField>
            <TextField label={t(locale, "fields.title")} name="title" required />
            <TextField label={t(locale, "contract.parties")} name="parties" required />
            <TextField label={t(locale, "fields.startDate")} name="effectiveOn" type="date" />
            <TextField label={t(locale, "fields.receivedOn")} name="receivedOn" type="date" />
            <TextField label={t(locale, "contract.revision")} name="revisionLabel" />
            <SelectField label={t(locale, "fields.file")} name="documentId">
              <option value="">—</option>
              {files.map((file) => <option key={file.id} value={file.id}>{file.title}</option>)}
            </SelectField>
            <label className="block">
              <span className="label">{t(locale, "actions.create")}</span>
              <input className="input" type="file" name="file" accept=".pdf,.txt,application/pdf,text/plain" />
            </label>
            <TextArea label={t(locale, "fields.notes")} name="notes" hint={t(locale, "contract.intro")} />
          </ActionForm>
        </div>
      ) : null}
    </div>
  );
}
