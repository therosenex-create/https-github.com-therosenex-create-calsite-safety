"use client";

import { useActionState } from "react";

export type ActionState = { error?: string; notice?: string };

export function ActionForm({
  action,
  submitLabel,
  children,
  multipart,
  secondary,
  variant,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  submitLabel: string;
  children: React.ReactNode;
  multipart?: boolean;
  secondary?: boolean;
  variant?: "primary" | "secondary" | "amber";
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const tone = variant ?? (secondary ? "secondary" : "primary");
  const buttonClass = tone === "amber" ? "btn-amber" : tone === "secondary" ? "btn-secondary" : "btn";
  return (
    <form action={formAction} className="space-y-4" encType={multipart ? "multipart/form-data" : undefined}>
      {children}
      {state.error ? (
        <p className="alert" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.notice ? <p className="note">{state.notice}</p> : null}
      <button className={buttonClass} type="submit" disabled={pending}>
        {submitLabel}
      </button>
    </form>
  );
}
