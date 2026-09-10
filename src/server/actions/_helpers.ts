import "server-only";
import type { ZodError } from "zod";
import { fail, type ActionFailure } from "@/lib/result";

/** Zod v4 issue list → RHF-style `Record<field, messages[]>`. */
export function fieldErrorsFromZod(error: ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.length ? issue.path.map(String).join(".") : "_form";
    (out[key] ??= []).push(issue.message);
  }
  return out;
}

export function validationFailure(error: ZodError): ActionFailure {
  return fail("Please fix the highlighted fields.", {
    code: "VALIDATION",
    fieldErrors: fieldErrorsFromZod(error),
  });
}
