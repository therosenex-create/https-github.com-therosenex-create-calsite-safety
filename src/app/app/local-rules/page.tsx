import { ActionForm } from "@/components/action-form";
import { EnumOptions, PageHeader, SelectField, TextArea, TextField } from "@/components/fields";
import { t } from "@/lib/i18n";
import { getActor, getLocale } from "@/lib/session";
import { listLocalRules } from "@/lib/services/local";
import { listRequirements } from "@/lib/services/regulatory";
import { listDocuments, listProjectOptions } from "@/lib/services/work";
import { localRuleAction } from "@/server/actions";

const topics = ["LOCAL_AMENDMENT", "FIRE_APPROVAL", "ENVIRONMENTAL", "RIGHT_OF_WAY", "OTHER"] as const;

export default async function LocalRulesPage() {
  const [actor, locale] = await Promise.all([getActor(), getLocale()]);
  const canWrite = actor.role !== "WORKER";
  const [notes, projects, documents, requirements] = await Promise.all([
    listLocalRules(actor),
    canWrite ? listProjectOptions(actor) : Promise.resolve([]),
    canWrite ? listDocuments(actor) : Promise.resolve(null),
    listRequirements(),
  ]);
  return (
    <div>
      <PageHeader title={t(locale, "nav.localRules")} subtitle={t(locale, "local.intro")} />
      <ul className="space-y-3">
        {notes.length === 0 ? <li className="text-sm text-muted">{t(locale, "common.none")}</li> : null}
        {notes.map((note) => (
          <li key={note.id} className="card text-sm">
            <p className="font-semibold">{t(locale, `enum.LocalTopic.${note.topic}`)} · {note.project?.name ?? "—"}</p>
            <p>{t(locale, `enum.ReviewStatus.${note.reviewStatus}`)}</p>
            <p className="mt-2 whitespace-pre-wrap">{note.ruleText}</p>
            {note.requirement ? <p className="text-muted">{note.requirement.citation}</p> : null}
            {note.citationUrl ? <p><a className="underline" href={note.citationUrl}>{note.citationUrl}</a></p> : null}
            <p className="hint">{t(locale, "city.noExtract")}</p>
          </li>
        ))}
      </ul>
      {canWrite ? (
        <div className="card mt-6">
          <ActionForm action={localRuleAction} submitLabel={t(locale, "actions.save")}>
            <SelectField label={t(locale, "fields.project")} name="projectId">
              <option value="">—</option>
              {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </SelectField>
            <SelectField label={t(locale, "fields.topic")} name="topic" defaultValue="LOCAL_AMENDMENT">
              <EnumOptions locale={locale} group="LocalTopic" values={topics} />
            </SelectField>
            <SelectField label={t(locale, "nav.requirements")} name="requirementId">
              <option value="">—</option>
              {requirements.map((requirement) => <option key={requirement.id} value={requirement.id}>{requirement.citation}</option>)}
            </SelectField>
            <TextArea label={t(locale, "fields.ruleText")} name="ruleText" required />
            <TextField label={t(locale, "fields.officialUrl")} name="citationUrl" />
            <TextArea label={t(locale, "fields.rationale")} name="rationale" hint={t(locale, "local.intro")} />
            <SelectField label={t(locale, "fields.status")} name="reviewStatus" defaultValue="PENDING_QUALIFIED_REVIEW">
              <EnumOptions locale={locale} group="ReviewStatus" values={["PENDING_QUALIFIED_REVIEW", "UNREVIEWED", "SOURCE_LINKED", "NEEDS_UPDATE"]} />
            </SelectField>
            <SelectField label={t(locale, "fields.file")} name="documentId">
              <option value="">—</option>
              {documents?.items.map((document) => <option key={document.id} value={document.id}>{document.title}</option>)}
            </SelectField>
          </ActionForm>
        </div>
      ) : null}
    </div>
  );
}
