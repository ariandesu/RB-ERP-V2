import { getDb } from "@/lib/db";
import { verifyJwt, type JwtPayload } from "@/lib/auth/jwt";
import { getAuthCookie } from "@/lib/auth/session";

export interface AuthContext {
  userId: string;
  role: string;
  email: string;
}

async function verifyAuth(): Promise<AuthContext> {
  const token = await getAuthCookie();
  if (!token) throw new Error("Unauthenticated. Please log in to perform this action.");

  const payload: JwtPayload = await verifyJwt(token);
  return {
    userId: payload.sub,
    role: payload.role as string,
    email: payload.email as string,
  };
}

async function verifyProfileAccess(moduleFlag: string): Promise<AuthContext> {
  const auth = await verifyAuth();

  const db = getDb();
  const profile = await db
    .prepare(`SELECT status, ${moduleFlag} FROM profiles WHERE id = ?`)
    .bind(auth.userId)
    .first<{ status: string; [key: string]: unknown }>();

  if (!profile || profile.status === "inactive") {
    throw new Error(
      "Unauthorized. Your account is inactive or does not have the required permissions."
    );
  }

  const flagValue = profile[moduleFlag];
  if (!flagValue) {
    throw new Error(
      `Unauthorized. You do not have access to this module.`
    );
  }

  return auth;
}

function assertWriteAccess(role: string) {
  if (role !== "super_admin" && role !== "admin" && role !== "warehouse_manager") {
    throw new Error("Unauthorized. Administrative role credentials required to modify records.");
  }
}

export { verifyAuth, verifyProfileAccess, assertWriteAccess };
