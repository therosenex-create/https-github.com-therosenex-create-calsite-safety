import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { EnumOptions, PageHeader, Pager, SelectField, TextArea, TextField } from "@/components/fields";
import { DOCUMENT_CATEGORIES } from "@/lib/checklists";
import { t } from "@/lib/i18n";
import { getActor, getLocale } from "@/lib/session";
import { listDocuments, listProjectOptions } from "@/lib/services/work";
import { createDocumentAction } from "@/server/actions";

export default async function DocumentsPage({ searchParams }: { searchParams: Promise<{ page?: string; archived?: string }> }) {
  const params = await searchParams;
  const [actor, locale] = await Promise.all([getActor(), getLocale()]);
  const archived = params.archived === "1";
  const [result, projects] = await Promise.all([
    listDocuments(actor, { page: params.page, archived }),
    actor.role === "WORKER" ? Promise.resolve([]) : listProjectOptions(actor),
  ]);
  return (
    <div>
      <PageHeader title={t(locale, "nav.files")} subtitle={t(locale, "hints.file")} />
      <ul className="space-y-3">
        {result.items.length === 0 ? <li className="text-sm text-muted">{t(locale, "empty.files")}</li> : null}
        {result.items.map((document) => (
          <li key={document.id} className="card">
            <Link className="font-semibold text-navy underline" href={`/app/documents/${document.id}`}>{document.title}</Link>
            <p className="text-sm text-muted">{t(locale, `enum.doc.${document.category}`)} · {document.project?.name ?? "—"}</p>
          </li>
        ))}
      </ul>
      <Pager page={result.page} total={result.total} pageSize={result.pageSize} previous={t(locale, "common.prev")} next={t(locale, "common.next")} hrefFor={(page) => `/app/documents?page=${page}${archived ? "&archived=1" : ""}`} />
      {actor.role !== "WORKER" ? (
        <details className="card mt-6">
          <summary className="cursor-pointer text-lg font-semibold">{t(locale, "actions.create")}</summary>
          <div className="mt-4">
            <ActionForm action={createDocumentAction} submitLabel={t(locale, "actions.create")} multipart>
              <TextField label={t(locale, "fields.title")} name="title" required />
              <SelectField label={t(locale, "fields.category")} name="category" defaultValue="other">
                <EnumOptions locale={locale} group="doc" values={DOCUMENT_CATEGORIES} />
              </SelectField>
              <SelectField label={t(locale, "fields.project")} name="projectId">
                <option value="">—</option>
                {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
              </SelectField>
              <TextArea label={t(locale, "fields.description")} name="description" />
              <label className="block">
                <span className="label">{t(locale, "fields.file")}</span>
                <input className="input" type="file" name="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,application/pdf,image/png,image/jpeg,image/webp,text/plain" />
                <span className="hint">{t(locale, "hints.file")}</span>
              </label>
            </ActionForm>
          </div>
        </details>
      ) : null}
    </div>
  );
}
