"use server";

import { redirect } from "next/navigation";
import type { ActionState } from "@/components/action-form";
import { isAppError } from "@/lib/errors";
import { errorText } from "@/lib/i18n";
import { getActor, getLocale } from "@/lib/session";
import { signContext } from "@/lib/sign/request";
import {
  createSignRequest,
  disableKiosk,
  enrollSigner,
  ownerSign,
  reviseLockedTailgate,
  revokeSigner,
  rotateKiosk,
} from "@/lib/services/crew-sign";

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

async function fail(error: unknown): Promise<ActionState> {
  const locale = await getLocale();
  if (isAppError(error)) return { error: errorText(locale, error.code, error.field) };
  return { error: errorText(locale, "generic") };
}

export async function enrollSignerAction(employeeId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await enrollSigner(
      await getActor(),
      {
        employeeId,
        language: text(formData, "language"),
        agreed: text(formData, "agreed"),
        printedName: text(formData, "printedName"),
        pin: text(formData, "pin"),
        confirmPin: text(formData, "confirmPin"),
        signaturePng: text(formData, "signaturePng"),
        strokes: text(formData, "strokes"),
      },
      await signContext(),
    );
  } catch (error) {
    return fail(error);
  }
  redirect(`/app/employees/${employeeId}`);
}

export async function revokeSignerAction(employeeId: string) {
  const actor = await getActor();
  await revokeSigner(actor, employeeId);
  redirect(`/app/employees/${employeeId}`);
}

export async function rotateKioskAction(projectId: string) {
  const issued = await rotateKiosk(await getActor(), projectId);
  redirect(`/app/projects/${projectId}?kiosk=${encodeURIComponent(issued.token)}`);
}

export async function disableKioskAction(projectId: string) {
  await disableKiosk(await getActor(), projectId);
  redirect(`/app/projects/${projectId}`);
}

export async function createSignRequestAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await createSignRequest(await getActor(), {
      recordType: text(formData, "recordType"),
      recordId: text(formData, "recordId"),
      projectId: text(formData, "projectId"),
      title: text(formData, "title"),
      body: text(formData, "body"),
      language: text(formData, "language"),
      formCode: text(formData, "formCode"),
    });
  } catch (error) {
    return fail(error);
  }
  redirect("/app/sign");
}

export async function ownerSignAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await ownerSign(
      await getActor(),
      {
        requestId: text(formData, "requestId"),
        password: text(formData, "password"),
        intent: text(formData, "intent"),
        typedName: text(formData, "typedName"),
        signaturePng: text(formData, "signaturePng"),
        strokes: text(formData, "strokes"),
        signerName: text(formData, "signerName"),
      },
      await signContext(),
    );
  } catch (error) {
    return fail(error);
  }
  redirect("/app/sign");
}

export async function reviseTailgateAction(meetingId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await reviseLockedTailgate(await getActor(), meetingId, {
      topicCode: text(formData, "topicCode"),
      points: text(formData, "points"),
      hazards: text(formData, "hazards"),
      language: text(formData, "language"),
    });
  } catch (error) {
    return fail(error);
  }
  redirect(`/app/meetings/${meetingId}`);
}
