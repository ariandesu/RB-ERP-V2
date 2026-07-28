"use server";

import { clearAuthCookie, getAuthCookie } from "@/lib/auth/session";
import { verifyJwt } from "@/lib/auth/jwt";
import { getDb } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function logoutAction() {
  try {
    // Invalidate server-side session
    const token = await getAuthCookie();
    if (token) {
      const payload = await verifyJwt(token);
      const db = getDb();
      await db
        .prepare("DELETE FROM sessions WHERE user_id = ?")
        .bind(payload.sub)
        .run();
    }
  } catch {
    // Cookie may be invalid or expired — still clear it
  }

  await clearAuthCookie();
  revalidatePath("/login");
  return { success: true };
}
