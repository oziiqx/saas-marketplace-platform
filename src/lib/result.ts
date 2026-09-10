/**
 * Discriminated result type returned by every Server Action so the client can
 * branch without try/catch and RHF can map field errors.
 */
export type ActionSuccess<T> = {
  ok: true;
  data: T;
  message?: string;
};

export type ActionFailure = {
  ok: false;
  error: string;
  /** Field-level errors keyed by form field name (for React Hook Form). */
  fieldErrors?: Record<string, string[]>;
  code?: ActionErrorCode;
};

export type ActionResult<T> = ActionSuccess<T> | ActionFailure;

export type ActionErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "PROVIDER_ERROR"
  | "UNKNOWN";

export function ok<T>(data: T, message?: string): ActionSuccess<T> {
  return { ok: true, data, message };
}

export function fail(
  error: string,
  opts: { fieldErrors?: Record<string, string[]>; code?: ActionErrorCode } = {},
): ActionFailure {
  return { ok: false, error, fieldErrors: opts.fieldErrors, code: opts.code };
}

/** Thrown inside actions/queries; converted to an ActionFailure at the boundary. */
export class AppError extends Error {
  constructor(
    message: string,
    readonly code: ActionErrorCode = "UNKNOWN",
    readonly fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function toActionFailure(err: unknown): ActionFailure {
  if (err instanceof AppError) {
    return fail(err.message, { code: err.code, fieldErrors: err.fieldErrors });
  }
  if (err instanceof Error) {
    return fail(err.message, { code: "UNKNOWN" });
  }
  return fail("Something went wrong. Please try again.", { code: "UNKNOWN" });
}
