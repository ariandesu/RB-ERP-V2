"use server";

import { getDb } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { signJwt } from "@/lib/auth/jwt";
import { revalidatePath } from "next/cache";

const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const LOCKOUT_MS = LOCKOUT_MINUTES * 60 * 1000;

export async function loginAction(email: string, password: string) {
  try {
    const db = getDb();

    const profile = await db
      .prepare("SELECT * FROM profiles WHERE email = ?")
      .bind(email)
      .first<any>();

    if (!profile) {
      return { success: false, error: "Invalid email or password." };
    }

    if (profile.status === "inactive") {
      return { success: false, error: "Invalid email or password." };
    }

    if (!profile.password_hash) {
      return { success: false, error: "Invalid email or password." };
    }

    // Rate limiting: check if account is locked
    if (profile.locked_until && profile.locked_until > Date.now()) {
      const remaining = Math.ceil((profile.locked_until - Date.now()) / 60000);
      return {
        success: false,
        error: `Account temporarily locked. Try again in ${remaining} minute(s).`,
      };
    }

    const valid = await verifyPassword(password, profile.password_hash);

    if (!valid) {
      // Increment failed attempts
      const attempts = (profile.login_attempts || 0) + 1;
      if (attempts >= MAX_ATTEMPTS) {
        await db
          .prepare(
            "UPDATE profiles SET login_attempts = ?, locked_until = ? WHERE id = ?"
          )
          .bind(attempts, Date.now() + LOCKOUT_MS, profile.id)
          .run();
        return {
          success: false,
          error: `Account temporarily locked. Try again in ${LOCKOUT_MINUTES} minute(s).`,
        };
      }
      await db
        .prepare("UPDATE profiles SET login_attempts = ? WHERE id = ?")
        .bind(attempts, profile.id)
        .run();
      return { success: false, error: "Invalid email or password." };
    }

    // Successful login — reset attempts and create session
    await db
      .prepare(
        "UPDATE profiles SET login_attempts = 0, locked_until = 0 WHERE id = ?"
      )
      .bind(profile.id)
      .run();

    const token = await signJwt({
      sub: profile.id,
      role: profile.role,
      email: profile.email,
      name: profile.name,
      status: profile.status,
      warehouse_access: profile.warehouse_access || "[]",
      dashboard_access: profile.dashboard_access,
      materials_access: profile.materials_access,
      goods_inward_access: profile.goods_inward_access,
      goods_outward_access: profile.goods_outward_access,
      purchase_orders_access: profile.purchase_orders_access,
      reports_access: profile.reports_access,
      analytics_access: profile.analytics_access,
      settings_access: profile.settings_access,
      user_management_access: profile.user_management_access,
    });

    // Create session record
    await db
      .prepare("INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)")
      .bind(crypto.randomUUID(), profile.id, Date.now() + 24 * 60 * 60 * 1000, Date.now())
      .run();

    revalidatePath("/");
    return { success: true, token };
  } catch (err: any) {
    console.error("loginAction error:", err);
    return { success: false, error: "Authentication failed. Please try again." };
  }
}
