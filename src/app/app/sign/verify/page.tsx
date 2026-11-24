import Link from "next/link";
import { notFound } from "next/navigation";
import { t } from "@/lib/i18n";
import { getActor, getLocale } from "@/lib/session";
import { verifyOrganization } from "@/lib/services/crew-sign";

export const dynamic = "force-dynamic";

export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ record?: string }> }) {
  const [actor, locale, params] = await Promise.all([getActor(), getLocale(), searchParams]);
  if (actor.role === "WORKER") notFound();
  const recordId = params.record?.trim() || "";
  const result = await verifyOrganization(actor.organizationId, recordId || undefined);
  return (
    <div>
      <p className="text-sm"><Link href="/app/sign">{t(locale, "nav.sign")}</Link></p>
      <h1 className="mt-2 font-serif text-3xl text-navy">{t(locale, "kiosk.verify")}</h1>
      <form className="mt-4 flex flex-wrap items-end gap-2" action="/app/sign/verify">
        <label className="block min-w-64 flex-1">
          <span className="label">{t(locale, "fields.recordId")}</span>
          <input className="input" name="record" defaultValue={recordId} />
        </label>
        <button className="btn" type="submit">{t(locale, "kiosk.verify")}</button>
      </form>
      <dl className="card mt-4 text-sm">
        <div><dt className="font-semibold">ok</dt><dd>{result.ok ? "true" : "false"}</dd></div>
        <div className="mt-2"><dt className="font-semibold">events</dt><dd>{result.eventCount}</dd></div>
        <div className="mt-2"><dt className="font-semibold">chain</dt><dd>{result.chainEventCount}</dd></div>
        {result.reason ? <div className="mt-2"><dt className="font-semibold">reason</dt><dd>{result.reason}</dd></div> : null}
        {result.pdf ? (
          <div className="mt-2">
            <dt className="font-semibold">pdf</dt>
            <dd><Link className="underline" href={`/api/sign/pdf/${result.pdf.id}`}>{result.pdf.fileName}</Link></dd>
            <dd className="break-all">{result.pdf.sha256}</dd>
          </div>
        ) : null}
      </dl>
    </div>
  );
}
