import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { PageHeader, SelectField, TextArea, TextField } from "@/components/fields";
import { StatusPill } from "@/components/status-pill";
import { IIPP_CORE_KEYS } from "@/lib/iipp-plan";
import { t } from "@/lib/i18n";
import { getActor, getLocale } from "@/lib/session";
import { getIippVault, listIippSubmittals } from "@/lib/services/regulatory";
import { listProjectOptions } from "@/lib/services/work";
import { formatDateOnly, formatPacific, toDateInput } from "@/lib/time";
import { createIippSubmittalAction, publishIippAction, setIippSubmittalStatusAction, updateIippAction, verifyIippAction } from "@/server/actions";

export default async function IippPage({ searchParams }: { searchParams: Promise<{ project?: string }> }) {
  const params = await searchParams;
  const [actor, locale] = await Promise.all([getActor(), getLocale()]);
  const projectId = params.project?.trim() || "";
  const [vault, projects, submittals] = await Promise.all([
    getIippVault(actor),
    listProjectOptions(actor),
    listIippSubmittals(actor, projectId || undefined),
  ]);
  const { program, revisions, live, differs } = vault;
  const canWrite = actor.role !== "WORKER";
  const display = live ?? null;
  const title = display?.title || program.title || t(locale, "iipp.noActive");
  const stateKey = display ? `enum.IippRevisionState.${display.state}` : program.status === "IN_PROGRESS" ? "enum.IippDisplay.IN_PROGRESS" : "enum.IippDisplay.TEMPLATE";
  const tone = display?.state === "VERIFIED" || display?.state === "ACTIVE" ? "ok" : "neutral";
  const adminName = display?.administratorName || program.administratorName;
  const adminTitle = display?.administratorTitle || program.administratorTitle;
  const reviewOn = display?.annualReviewOn ?? program.annualReviewOn;
  const core = IIPP_CORE_KEYS.map((key) => program.elements.find((element) => element.key === key)).filter((element) => element != null);
  return (
    <div>
      <PageHeader title={t(locale, "iipp.vault")} subtitle={t(locale, "iipp.cite")} />
      <p className="note">{t(locale, "iipp.intro")}</p>
      {differs ? <p className="note mt-3">{t(locale, "iipp.differs")}</p> : null}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <section className="card space-y-4 lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-amber">{t(locale, "iipp.active")}</p>
              <h2 className="mt-1 font-serif text-2xl text-navy">{title}</h2>
              {display ? <p className="text-sm text-muted">{t(locale, "fields.revision")}: {display.revisionLabel}</p> : null}
            </div>
            <StatusPill tone={tone}>{t(locale, stateKey)}</StatusPill>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-line bg-sand p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t(locale, "iipp.administrator")}</p>
              <p className="mt-1 font-semibold text-navy">{adminName || "—"}</p>
              <p className="text-sm text-muted">{adminTitle || t(locale, "iipp.administratorHint")}</p>
            </div>
            <div className="rounded-lg border border-line bg-sand p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t(locale, "iipp.annual")}</p>
              <p className="mt-1 font-semibold text-amber">{formatDateOnly(locale, reviewOn)}</p>
              <p className="text-sm text-muted">{t(locale, "iipp.annualHint")}</p>
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-navy">{t(locale, "iipp.core")}</h3>
            <ul className="mt-2 grid gap-2 sm:grid-cols-2">
              {core.map((element) => {
                const recorded = Boolean(element.userProcedure?.trim());
                return (
                  <li key={element.id} className="rounded-lg border border-line px-3 py-2 text-sm">
                    <p className="font-semibold">{locale === "es" ? element.titleEs : element.titleEn}</p>
                    <p className="text-xs text-muted">{element.citation}</p>
                    <p className={recorded ? "text-pine" : "text-amber"}>{t(locale, recorded ? "iipp.procedureOn" : "iipp.procedureOff")}</p>
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="flex flex-wrap gap-3 border-t border-line pt-3">
            <Link className="btn-amber" href={display ? `/app/iipp/print?revision=${display.id}` : "/app/iipp/print?source=working"}>
              {t(locale, "iipp.download")}
            </Link>
            <Link className="btn-secondary" href="/app/iipp/print?source=working">
              {t(locale, "iipp.printWorking")}
            </Link>
          </div>
          <p className="text-sm text-muted">{t(locale, "iipp.verifiedNote")}</p>
        </section>
        <section className="card space-y-3">
          <h2 className="font-serif text-2xl text-navy">{t(locale, "iipp.submittals")}</h2>
          <p className="text-sm text-muted">{t(locale, "iipp.submittalsHint")}</p>
          <form className="flex flex-wrap items-end gap-2" action="/app/iipp">
            <div className="min-w-40 flex-1">
              <SelectField label={t(locale, "fields.project")} name="project" defaultValue={projectId}>
                <option value="">{t(locale, "fields.allProjects")}</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </SelectField>
            </div>
            <button className="btn-secondary" type="submit">
              {t(locale, "actions.filter")}
            </button>
          </form>
          {submittals.length === 0 ? <p className="text-sm text-muted">{t(locale, "empty.submittals")}</p> : null}
          <ul className="space-y-2">
            {submittals.map((row) => (
              <li key={row.id} className="rounded-lg border border-line p-3 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-navy">{row.companyName}</p>
                    <p className="text-xs text-muted">{row.project.name}</p>
                    {row.note ? <p className="mt-1">{row.note}</p> : null}
                  </div>
                  <StatusPill tone={row.status === "APPROVED" ? "ok" : "due"}>{t(locale, `enum.IippSubmittalStatus.${row.status}`)}</StatusPill>
                </div>
                {canWrite ? (
                  <form className="mt-2" action={setIippSubmittalStatusAction.bind(null, row.id)}>
                    <input type="hidden" name="projectId" value={projectId} />
                    <input type="hidden" name="status" value={row.status === "APPROVED" ? "PENDING_REVIEW" : "APPROVED"} />
                    <button className="btn-secondary" type="submit">
                      {t(locale, row.status === "APPROVED" ? "actions.markPending" : "actions.markApproved")}
                    </button>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
          {canWrite && projects.length > 0 ? (
            <ActionForm action={createIippSubmittalAction} submitLabel={t(locale, "actions.addSubmittal")} variant="secondary">
              <SelectField label={t(locale, "fields.project")} name="projectId" required defaultValue={projectId || projects[0]?.id}>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </SelectField>
              <TextField label={t(locale, "fields.subcontractor")} name="companyName" required />
              <TextArea label={t(locale, "iipp.submittalNote")} name="note" rows={2} />
            </ActionForm>
          ) : null}
        </section>
      </div>
      {canWrite ? (
        <section className="card mt-4 space-y-4">
          <h2 className="font-serif text-2xl text-navy">{t(locale, "iipp.working")}</h2>
          <p className="text-sm text-muted">{t(locale, "iipp.saveFirst")}</p>
          <ActionForm action={updateIippAction} submitLabel={t(locale, "actions.save")}>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label={t(locale, "fields.planTitle")} name="title" defaultValue={program.title} />
              <TextField label={t(locale, "fields.revision")} name="revisionLabel" defaultValue={program.revisionLabel} />
              <TextField label={t(locale, "fields.administratorName")} name="administratorName" defaultValue={program.administratorName} hint={t(locale, "iipp.administratorHint")} />
              <TextField label={t(locale, "fields.administratorTitle")} name="administratorTitle" defaultValue={program.administratorTitle} />
              <TextField label={t(locale, "fields.annualReviewOn")} name="annualReviewOn" type="date" defaultValue={toDateInput(program.annualReviewOn)} />
            </div>
            <h3 className="font-semibold text-navy">{t(locale, "iipp.elements")}</h3>
            {program.elements.map((element) => (
              <fieldset key={element.id} className="space-y-3 rounded-lg border border-line p-3">
                <legend className="px-1 font-serif text-xl text-navy">{locale === "es" ? element.titleEs : element.titleEn}</legend>
                <p className="text-sm text-muted">{element.citation}</p>
                <TextField label={t(locale, "fields.responsibleName")} name={`responsible_${element.key}`} defaultValue={element.responsibleName} />
                <TextArea label={t(locale, "fields.description")} name={`procedure_${element.key}`} defaultValue={element.userProcedure} />
              </fieldset>
            ))}
            <TextArea label={t(locale, "fields.implementationClaim")} name="implementationClaim" defaultValue={program.implementationClaim} hint={t(locale, "hints.claim")} />
          </ActionForm>
          <div className="grid gap-4 border-t border-line pt-4 md:grid-cols-2">
            <ActionForm action={publishIippAction} submitLabel={t(locale, "actions.recordRevision")} variant="amber">
              <p className="text-sm text-muted">{t(locale, "iipp.markActive")}</p>
            </ActionForm>
            <ActionForm action={verifyIippAction} submitLabel={t(locale, "actions.verifyRevision")} variant="secondary">
              <p className="text-sm text-muted">{t(locale, "iipp.verifiedNote")}</p>
            </ActionForm>
          </div>
        </section>
      ) : (
        <ul className="mt-4 space-y-3">
          {program.elements.map((element) => (
            <li key={element.id} className="card">
              <h2 className="font-semibold">{locale === "es" ? element.titleEs : element.titleEn}</h2>
              <p className="text-sm text-muted">{element.citation}</p>
              <p className="mt-2 whitespace-pre-wrap text-sm">{element.userProcedure}</p>
            </li>
          ))}
        </ul>
      )}
      <section className="mt-6">
        <h2 className="font-serif text-2xl text-navy">{t(locale, "iipp.revisions")}</h2>
        {revisions.length === 0 ? <p className="mt-2 text-sm text-muted">{t(locale, "empty.revisions")}</p> : null}
        <ul className="mt-3 space-y-2">
          {revisions.map((revision) => (
            <li key={revision.id} className="card flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold text-navy">
                  {revision.title} · {revision.revisionLabel}
                </p>
                <p className="text-sm text-muted">
                  {revision.administratorName ?? "—"} · {formatPacific(locale, revision.createdAt)}
                  {revision.verifiedAt ? ` · ${formatPacific(locale, revision.verifiedAt)}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusPill tone={revision.state === "SUPERSEDED" ? "neutral" : "ok"}>{t(locale, `enum.IippRevisionState.${revision.state}`)}</StatusPill>
                <Link className="text-sm font-semibold text-navy underline" href={`/app/iipp/print?revision=${revision.id}`}>
                  {t(locale, "actions.print")}
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
