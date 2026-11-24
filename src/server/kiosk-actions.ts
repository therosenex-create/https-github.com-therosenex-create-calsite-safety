"use server";

import { redirect } from "next/navigation";
import { AppError, isAppError } from "@/lib/errors";
import { errorText } from "@/lib/i18n";
import { getLocale } from "@/lib/session";
import { signContext } from "@/lib/sign/request";
import {
  kioskFinish,
  kioskSign,
  kioskSignVisitor,
  kioskStartTailgate,
  kioskUploadPaper,
} from "@/lib/services/crew-sign";
import type { ActionState } from "@/components/action-form";
import { MAX_FILE_BYTES } from "@/lib/files";

async function fail(error: unknown): Promise<ActionState> {
  const locale = await getLocale();
  if (isAppError(error)) return { error: errorText(locale, error.code, error.field) };
  return { error: errorText(locale, "generic") };
}

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function kioskStartAction(token: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await kioskStartTailgate(
      token,
      {
        employeeId: text(formData, "employeeId"),
        pin: text(formData, "pin"),
        topicCode: text(formData, "topicCode"),
        points: text(formData, "points"),
        hazards: text(formData, "hazards"),
        language: text(formData, "language"),
      },
      await signContext(),
    );
  } catch (error) {
    return fail(error);
  }
  redirect(`/k/${token}`);
}

export async function kioskSignAction(token: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const employeeId = text(formData, "employeeId");
  try {
    await kioskSign(
      token,
      {
        employeeId,
        pin: text(formData, "pin"),
        attestation: text(formData, "attestation"),
        signaturePng: text(formData, "signaturePng"),
        strokes: text(formData, "strokes"),
        typedName: text(formData, "typedName"),
        signerName: text(formData, "signerName"),
      },
      await signContext(),
    );
  } catch (error) {
    return fail(error);
  }
  redirect(`/k/${token}`);
}

export async function kioskVisitorAction(token: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await kioskSignVisitor(
      token,
      {
        visitorName: text(formData, "visitorName"),
        companyName: text(formData, "companyName"),
        typedName: text(formData, "typedName"),
        attestation: text(formData, "attestation"),
        signaturePng: text(formData, "signaturePng"),
        strokes: text(formData, "strokes"),
      },
      await signContext(),
    );
  } catch (error) {
    return fail(error);
  }
  redirect(`/k/${token}`);
}

export async function kioskFinishAction(token: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await kioskFinish(token, { employeeId: text(formData, "employeeId"), pin: text(formData, "pin") }, await signContext());
  } catch (error) {
    return fail(error);
  }
  redirect(`/k/${token}`);
}

export async function kioskPaperAction(token: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return fail(new AppError("file_type"));
  if (file.size > MAX_FILE_BYTES) return fail(new AppError("file_too_large"));
  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    await kioskUploadPaper(
      token,
      { pin: text(formData, "pin"), fileName: file.name, mimeType: file.type || "application/octet-stream", bytes },
      await signContext(),
    );
  } catch (error) {
    return fail(error);
  }
  redirect(`/k/${token}`);
}
