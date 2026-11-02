import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { EnumOptions, PageHeader, SelectField, TextArea } from "@/components/fields";
import { t } from "@/lib/i18n";
import { getActor, getLocale } from "@/lib/session";
import { listReviewQueue } from "@/lib/services/records";
import { formatPacific } from "@/lib/time";
import { reviewAction } from "@/server/actions";

const decisions = ["STILL_PENDING", "SOURCE_READ_WITH_LIMITATIONS", "NEEDS_ANOTHER_PASS"] as const;

export default async function ReviewsPage() {
  const [actor, locale] = await Promise.all([getActor(), getLocale()]);
  const queue = await listReviewQueue(actor);
  const canWrite = actor.role !== "WORKER";
  return (
    <div>
      <PageHeader title={t(locale, "nav.reviews")} subtitle={t(locale, "review.intro")} />
      <ul className="space-y-4">
        {queue.map((requirement) => {
          const latest = requirement.reviews[0];
          return (
            <li key={requirement.id} className="card">
              <Link className="font-semibold text-navy underline" href={`/app/regulatory/requirements/${requirement.id}`}>
                {requirement.citation}
              </Link>
              <p className="text-sm text-muted">{requirement.code} · {t(locale, `enum.ReviewStatus.${requirement.reviewStatus}`)}</p>
              {latest ? (
                <p className="mt-2 text-sm">
                  {t(locale, `enum.CompanyReviewDecision.${latest.decision}`)} · {formatPacific(locale, latest.reviewedAt)}
                </p>
              ) : (
                <p className="mt-2 text-sm text-muted">{t(locale, "enum.CompanyReviewDecision.STILL_PENDING")}</p>
              )}
              {canWrite ? (
                <div className="mt-3">
                  <ActionForm action={reviewAction} submitLabel={t(locale, "actions.recordReview")}>
                    <input type="hidden" name="requirementId" value={requirement.id} />
                    <SelectField label={t(locale, "fields.decision")} name="decision" defaultValue="STILL_PENDING">
                      <EnumOptions locale={locale} group="CompanyReviewDecision" values={decisions} />
                    </SelectField>
                    <TextArea label={t(locale, "fields.note")} name="note" required />
                    <label className="flex min-h-11 items-start gap-3 text-sm">
                      <input type="checkbox" name="acknowledgedNotCertification" value="yes" />
                      <span>{t(locale, "review.notCertification")}</span>
                    </label>
                  </ActionForm>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
