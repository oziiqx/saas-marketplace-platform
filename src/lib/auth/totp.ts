import { generateSecret, generateURI, verify } from "otplib";

const ISSUER = "SaaS Marketplace";

export function createTotpSecret(): string {
  return generateSecret();
}

export function totpAuthUri(secret: string, accountEmail: string): string {
  return generateURI({ issuer: ISSUER, label: accountEmail, secret });
}

/** Constant-time verification with a ±1 step (30s) tolerance for clock drift. */
export async function verifyTotp(secret: string, token: string): Promise<boolean> {
  try {
    const result = await verify({ secret, token, epochTolerance: 30 });
    return result.valid;
  } catch {
    return false;
  }
}
