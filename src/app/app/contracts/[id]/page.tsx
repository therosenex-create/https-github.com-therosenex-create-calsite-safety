import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { PageHeader, SelectField, TextArea, TextField } from "@/components/fields";
import { isAppError } from "@/lib/errors";
import { t } from "@/lib/i18n";
import { getActor, getLocale } from "@/lib/session";
import { getContractDocument, listContractFileOptions } from "@/lib/services/contracts";
import { listRequirements } from "@/lib/services/regulatory";
import { formatDateOnly, formatPacific } from "@/lib/time";
import { contractAcceptAction, contractDraftAction, contractImpactAction, contractTaskAction } from "@/server/actions";

export default async function ContractDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [actor, locale] = await Promise.all([getActor(), getLocale()]);
  const canWrite = actor.role !== "WORKER";
  const document = await getContractDocument(actor, id).catch((error) => {
    if (isAppError(error) && error.code === "not_found") notFound();
    throw error;
  });
  const [requirements, files] = canWrite
    ? await Promise.all([listRequirements(), listContractFileOptions(actor)])
    : [[], []];
  return (
    <div>
      <p className="text-sm"><Link href="/app/contracts">{t(locale, "nav.contracts")}</Link></p>
      <PageHeader title={document.title} subtitle={t(locale, "contract.intro")} />
      <p className="text-sm">{document.project.name} · {t(locale, `enum.ContractType.${document.docType}`)}</p>
      <p className="mt-1 text-sm">{document.parties} · {document.revisionLabel ?? "—"}</p>
      <p className="mt-1 text-sm text-muted">{formatDateOnly(locale, document.effectiveOn)} · {formatDateOnly(locale, document.receivedOn)}</p>
      {document.notes ? <p className="mt-3 whitespace-pre-wrap text-sm">{document.notes}</p> : null}
      <p className="mt-3 text-sm"><Link className="underline" href={`/app/documents/${document.document.id}`}>{document.document.title}</Link></p>
      {document.docType === "ADDENDUM" ? (
        <section className="note mt-4">
          <p>{t(locale, "contract.impact")}</p>
          {document.impactReviews.map((review) => (
            <p key={review.id} className="mt-2 text-sm">{t(locale, "contract.reviewed")} {review.reviewer.name} · {formatPacific(locale, review.reviewedAt)} · {review.note}</p>
          ))}
          {canWrite && document.impactReviews.length === 0 ? (
            <div className="mt-3">
              <ActionForm action={contractImpactAction} submitLabel={t(locale, "actions.save")}>
                <input type="hidden" name="contractDocumentId" value={document.id} />
                <TextArea label={t(locale, "fields.note")} name="note" required />
              </ActionForm>
            </div>
          ) : null}
        </section>
      ) : null}
      <ul className="mt-6 space-y-4">
        {document.drafts.map((draft) => (
          <li key={draft.id} className="card text-sm">
            <p className="font-semibold">{draft.clauseReference} · {t(locale, `enum.ContractDraft.${draft.status}`)}</p>
            <p className="note mt-2">{t(locale, "contract.unverified")}</p>
            <p className="mt-2 whitespace-pre-wrap">{draft.quote}</p>
            {draft.requirement ? <p className="mt-2"><Link className="underline" href={`/app/regulatory/requirements/${draft.requirement.id}`}>{draft.requirement.citation}</Link></p> : null}
            <p className="mt-2 text-muted">{t(locale, "contract.trace")}: {document.document.title}</p>
            {draft.status === "ACCEPTED" ? (
              <div className="mt-3">
                <p>{t(locale, "contract.acceptedBy")}: {draft.acceptedBy?.name ?? "—"} · {formatPacific(locale, draft.acceptedAt)}</p>
                <p>{draft.acceptReason}</p>
                {draft.localRuleNote ? <p>{t(locale, `enum.ReviewStatus.${draft.localRuleNote.reviewStatus}`)}</p> : null}
                {draft.task ? <p>{draft.task.title} · {t(locale, `enum.TaskStatus.${draft.task.status}`)} · {formatDateOnly(locale, draft.task.dueAt)}</p> : null}
                {canWrite && draft.task ? (
                  <div className="mt-3">
                    <ActionForm action={contractTaskAction} submitLabel={t(locale, "actions.save")}>
                      <input type="hidden" name="taskId" value={draft.task.id} />
                      <SelectField label={t(locale, "fields.status")} name="status" defaultValue={draft.task.status}>
                        <option value="OPEN">{t(locale, "enum.TaskStatus.OPEN")}</option>
                        <option value="DONE">{t(locale, "enum.TaskStatus.DONE")}</option>
                      </SelectField>
                      <SelectField label={t(locale, "fields.file")} name="documentId" defaultValue={draft.task.evidenceDocumentId ?? ""}>
                        <option value="">—</option>
                        {files.map((file) => <option key={file.id} value={file.id}>{file.title}</option>)}
                      </SelectField>
                    </ActionForm>
                  </div>
                ) : null}
              </div>
            ) : null}
            {canWrite && draft.status === "DRAFT" ? (
              <div className="mt-3">
                <ActionForm action={contractAcceptAction} submitLabel={t(locale, "actions.save")}>
                  <input type="hidden" name="draftId" value={draft.id} />
                  <TextArea label={t(locale, "contract.reason")} name="reason" required hint={t(locale, "contract.unverified")} />
                  <TextField label={t(locale, "fields.dueDate")} name="dueOn" type="date" />
                </ActionForm>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
      {canWrite ? (
        <div className="card mt-6">
          <p className="note mb-3">{t(locale, "contract.unverified")}</p>
          <ActionForm action={contractDraftAction} submitLabel={t(locale, "actions.save")}>
            <input type="hidden" name="contractDocumentId" value={document.id} />
            <TextField label={t(locale, "contract.clause")} name="clauseReference" required />
            <TextArea label={t(locale, "contract.quote")} name="quote" required />
            <SelectField label={t(locale, "nav.requirements")} name="requirementId">
              <option value="">—</option>
              {requirements.map((requirement) => <option key={requirement.id} value={requirement.id}>{requirement.citation}</option>)}
            </SelectField>
          </ActionForm>
        </div>
      ) : null}
    </div>
  );
}
