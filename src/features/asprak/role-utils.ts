import type { Role } from "@/types";

const VALID_ROLES: readonly Role[] = ["praktikan", "asisten", "asprak", "aslab"];

/**
 * Memvalidasi apakah nilai role dari Firestore termasuk role aplikasi yang didukung.
 */
export function isValidAppRole(value: unknown): value is Role {
  return typeof value === "string" && (VALID_ROLES as readonly string[]).includes(value);
}

/**
 * Mengembalikan true untuk pengguna dengan peran Asprak (termasuk alias legacy 'asisten').
 */
export function isAsprakRole(role?: string | null): boolean {
  return role === "asprak" || role === "asisten";
}

/**
 * Mengembalikan true untuk seluruh peran pengelola lab (Asprak, Aslab, maupun legacy Asisten).
 */
export function isStaffRole(role?: string | null): boolean {
  return role === "asprak" || role === "aslab" || role === "asisten";
}
