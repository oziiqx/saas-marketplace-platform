import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/** Cheap strength gate mirrored by the Zod schema on the client. */
export function isStrongPassword(plain: string): boolean {
  return (
    plain.length >= 8 &&
    /[a-z]/.test(plain) &&
    /[A-Z]/.test(plain) &&
    /[0-9]/.test(plain)
  );
}
