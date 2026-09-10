import { LogLevel } from "@prisma/client";
import { db } from "@/lib/db";
import { isDev } from "@/lib/env";

type LogContext = Record<string, unknown>;

const CONSOLE_METHOD: Record<LogLevel, "debug" | "info" | "warn" | "error"> = {
  DEBUG: "debug",
  INFO: "info",
  WARN: "warn",
  ERROR: "error",
  FATAL: "error",
};

/**
 * Structured logger. Writes to stdout always, and persists WARN+ to the
 * `SystemLog` table so the Admin → System Logs studio has data to browse.
 * Persistence failures are swallowed - logging must never break a request.
 */
async function write(
  level: LogLevel,
  source: string,
  message: string,
  context: LogContext = {},
): Promise<void> {
  const line = { level, source, message, ...context };
  console[CONSOLE_METHOD[level]](JSON.stringify(line));

  if (level === "DEBUG" || (level === "INFO" && !isDev)) return;

  try {
    await db.systemLog.create({
      data: { level, source, message, context: context as object },
    });
  } catch {
    /* best-effort persistence */
  }
}

export const logger = {
  debug: (source: string, message: string, context?: LogContext) =>
    write("DEBUG", source, message, context),
  info: (source: string, message: string, context?: LogContext) =>
    write("INFO", source, message, context),
  warn: (source: string, message: string, context?: LogContext) =>
    write("WARN", source, message, context),
  error: (source: string, message: string, context?: LogContext) =>
    write("ERROR", source, message, context),
  fatal: (source: string, message: string, context?: LogContext) =>
    write("FATAL", source, message, context),
};
