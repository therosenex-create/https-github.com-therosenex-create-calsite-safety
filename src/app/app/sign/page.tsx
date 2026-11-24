import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { SelectField, TextArea, TextField } from "@/components/fields";
import { SignaturePad } from "@/components/signature-pad";
import { t } from "@/lib/i18n";
import { getActor, getLocale } from "@/lib/session";
import { listAwaitingSignatures } from "@/lib/services/crew-sign";
import { listProjectOptions } from "@/lib/services/work";
import { createSignRequestAction, ownerSignAction } from "@/server/sign-actions";

export const dynamic = "force-dynamic";

export default async function SignQueuePage() {
  const [actor, locale] = await Promise.all([getActor(), getLocale()]);
  const [queue, projects] = await Promise.all([
    listAwaitingSignatures(actor),
    actor.role === "WORKER" ? Promise.resolve([]) : listProjectOptions(actor),
  ]);
  const canWrite = actor.role !== "WORKER";
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl text-navy">{t(locale, "kiosk.queue")}</h1>
        <p className="mt-2 max-w-3xl text-sm">{t(locale, "sign.intro")}</p>
        <p className="mt-2 text-sm"><Link className="underline" href="/app/sign/verify">{t(locale, "kiosk.verify")}</Link></p>
      </div>
      {actor.role === "ADMIN" ? (
        <ul className="space-y-4">
          {queue.length === 0 ? <li className="text-sm text-muted">{t(locale, "common.none")}</li> : null}
          {queue.map((request) => (
            <li key={request.id} className="card">
              <h2 className="font-serif text-2xl">{request.title}</h2>
              <p className="mt-1 text-sm text-muted">{request.recordType} · {request.project?.name ?? "—"}</p>
              <p className="mt-3 whitespace-pre-wrap text-sm">{request.body}</p>
              <div className="mt-4">
                <ActionForm action={ownerSignAction} submitLabel={t(locale, "kiosk.sign")}>
                  <input type="hidden" name="requestId" value={request.id} />
                  <label className="flex min-h-14 items-start gap-3 text-base">
                    <input className="mt-1 h-6 w-6" type="checkbox" name="intent" value="yes" required />
                    <span>{t(locale, "kiosk.intent")}</span>
                  </label>
                  <TextField label={t(locale, "kiosk.printedName")} name="typedName" required defaultValue={actor.name} />
                  <SignaturePad label={t(locale, "kiosk.draw")} clearLabel={t(locale, "kiosk.clear")} />
                  <TextField label={t(locale, "sign.password")} name="password" type="password" required autoComplete="current-password" />
                </ActionForm>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">{t(locale, "common.workerLimit")}</p>
      )}
      {canWrite ? (
        <section className="card">
          <h2 className="font-serif text-2xl">{t(locale, "sign.request")}</h2>
          <div className="mt-4">
            <ActionForm action={createSignRequestAction} submitLabel={t(locale, "sign.request")}>
              <SelectField label={t(locale, "fields.recordKind")} name="recordType" defaultValue="PROGRAM_ADOPTION">
                <option value="PROGRAM_ADOPTION">PROGRAM_ADOPTION</option>
                <option value="JHA_SIGNOFF">JHA_SIGNOFF</option>
                <option value="TRAINING_ACK">TRAINING_ACK</option>
                <option value="INSPECTION">INSPECTION</option>
                <option value="CP_ACCEPTANCE">CP_ACCEPTANCE</option>
              </SelectField>
              <TextField label={t(locale, "fields.title")} name="title" required />
              <TextArea label={t(locale, "fields.summary")} name="body" required />
              <TextField label={t(locale, "fields.recordId")} name="recordId" />
              <TextField label={t(locale, "kiosk.projectCode")} name="formCode" required defaultValue="PRG" />
              <SelectField label={t(locale, "fields.project")} name="projectId" defaultValue="">
                <option value="">—</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </SelectField>
              <SelectField label={t(locale, "fields.language")} name="language" defaultValue={locale}>
                <option value="en">English</option>
                <option value="es">Español</option>
              </SelectField>
            </ActionForm>
          </div>
        </section>
      ) : null}
    </div>
  );
}
