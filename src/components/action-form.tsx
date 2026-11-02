"use client";

import { useActionState } from "react";

export type ActionState = { error?: string };

export function ActionForm({
  action,
  submitLabel,
  children,
  multipart,
  secondary,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  submitLabel: string;
  children: React.ReactNode;
  multipart?: boolean;
  secondary?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="space-y-4" encType={multipart ? "multipart/form-data" : undefined}>
      {children}
      {state.error ? (
        <p className="alert" role="alert">
          {state.error}
        </p>
      ) : null}
      <button className={secondary ? "btn-secondary" : "btn"} type="submit" disabled={pending}>
        {submitLabel}
      </button>
    </form>
  );
}
