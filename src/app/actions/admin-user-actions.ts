"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { verifyAuth, verifyProfileAccess, assertWriteAccess } from "@/lib/db/auth-helpers";
import { convertDates } from "@/lib/db/dates";
import type { UserRole, UserStatus, UserProfile } from "@/types";

// 1. READ: Fetch all user profiles
export async function getUsersAction(): Promise<UserProfile[]> {
  try {
    await verifyProfileAccess("user_management_access");
    const db = getDb();

    const { results: profiles } = await db
      .prepare("SELECT id, email, name, role, status, warehouse_access, dashboard_access, materials_access, goods_inward_access, goods_outward_access, purchase_orders_access, reports_access, analytics_access, settings_access, user_management_access, created_at, updated_at FROM profiles ORDER BY created_at DESC")
      .all();

    const formatted = (profiles || []).map((p: any) => {
      let warehouseAccess: string[] = [];
      try {
        warehouseAccess = JSON.parse(p.warehouse_access || "[]");
      } catch {}
      return convertDates({
        ...p,
        warehouse_access: warehouseAccess,
        dashboard_access: !!p.dashboard_access,
        materials_access: !!p.materials_access,
        goods_inward_access: !!p.goods_inward_access,
        goods_outward_access: !!p.goods_outward_access,
        purchase_orders_access: !!p.purchase_orders_access,
        reports_access: !!p.reports_access,
        analytics_access: !!p.analytics_access,
        settings_access: !!p.settings_access,
        user_management_access: !!p.user_management_access,
      });
    });

    return formatted as unknown as UserProfile[];
  } catch (err: any) {
    console.error("getUsersAction error:", err);
    throw new Error(err.message || "Failed to retrieve user directory.");
  }
}

// 2. CREATE: Create new user with hashed password
export async function createUserAction(formData: {
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  status: UserStatus;
  warehouse_access: string[];
  permissions: {
    dashboard_access: boolean;
    materials_access: boolean;
    goods_inward_access: boolean;
    goods_outward_access: boolean;
    reports_access: boolean;
    purchase_orders_access: boolean;
    analytics_access: boolean;
    settings_access: boolean;
    user_management_access: boolean;
  };
}) {
  try {
    await verifyProfileAccess("user_management_access");
    const db = getDb();
    const now = Date.now();
    const userId = crypto.randomUUID();
    const password = formData.password || "TemporaryPass123!";
    const passwordHash = await hashPassword(password);

    await db
      .prepare(
        `INSERT INTO profiles (id, email, name, role, status, warehouse_access, dashboard_access, materials_access, goods_inward_access, goods_outward_access, purchase_orders_access, reports_access, analytics_access, settings_access, user_management_access, password_hash, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        userId,
        formData.email,
        formData.name,
        formData.role,
        formData.status,
        JSON.stringify(formData.warehouse_access),
        formData.permissions.dashboard_access ? 1 : 0,
        formData.permissions.materials_access ? 1 : 0,
        formData.permissions.goods_inward_access ? 1 : 0,
        formData.permissions.goods_outward_access ? 1 : 0,
        formData.permissions.purchase_orders_access ? 1 : 0,
        formData.permissions.reports_access ? 1 : 0,
        formData.permissions.analytics_access ? 1 : 0,
        formData.permissions.settings_access ? 1 : 0,
        formData.permissions.user_management_access ? 1 : 0,
        passwordHash,
        now,
        now
      )
      .run();

    revalidatePath("/admin/user-management");
    return { success: true, userId };
  } catch (err: any) {
    console.error("createUserAction error:", err);
    return { success: false, error: err.message || "Failed to create new user." };
  }
}

// 3. UPDATE: Modify user profile permissions
export async function updateUserAction(
  userId: string,
  formData: {
    name: string;
    role: UserRole;
    status: UserStatus;
    warehouse_access: string[];
    permissions: {
      dashboard_access: boolean;
      materials_access: boolean;
      goods_inward_access: boolean;
      goods_outward_access: boolean;
      reports_access: boolean;
      purchase_orders_access: boolean;
      analytics_access: boolean;
      settings_access: boolean;
      user_management_access: boolean;
    };
  }
) {
  try {
    const actorId = (await verifyProfileAccess("user_management_access")).userId;

    if (userId === actorId && formData.status === "inactive") {
      throw new Error("Self-Deactivation Blocked. You cannot set your own account to inactive.");
    }

    const db = getDb();

    await db
      .prepare(
        `UPDATE profiles SET name = ?, role = ?, status = ?, warehouse_access = ?, dashboard_access = ?, materials_access = ?, goods_inward_access = ?, goods_outward_access = ?, purchase_orders_access = ?, reports_access = ?, analytics_access = ?, settings_access = ?, user_management_access = ?, updated_at = ? WHERE id = ?`
      )
      .bind(
        formData.name,
        formData.role,
        formData.status,
        JSON.stringify(formData.warehouse_access),
        formData.permissions.dashboard_access ? 1 : 0,
        formData.permissions.materials_access ? 1 : 0,
        formData.permissions.goods_inward_access ? 1 : 0,
        formData.permissions.goods_outward_access ? 1 : 0,
        formData.permissions.purchase_orders_access ? 1 : 0,
        formData.permissions.reports_access ? 1 : 0,
        formData.permissions.analytics_access ? 1 : 0,
        formData.permissions.settings_access ? 1 : 0,
        formData.permissions.user_management_access ? 1 : 0,
        Date.now(),
        userId
      )
      .run();

    revalidatePath("/admin/user-management");
    return { success: true };
  } catch (err: any) {
    console.error("updateUserAction error:", err);
    return { success: false, error: err.message || "Failed to update user profile." };
  }
}

// 4. DELETE: Remove user
export async function deleteUserAction(userId: string) {
  try {
    const actorId = (await verifyProfileAccess("user_management_access")).userId;

    if (userId === actorId) {
      throw new Error("Self-Deletion Blocked. You cannot delete your own administrative session.");
    }

    const db = getDb();
    await db.prepare("DELETE FROM profiles WHERE id = ?").bind(userId).run();

    revalidatePath("/admin/user-management");
    return { success: true };
  } catch (err: any) {
    console.error("deleteUserAction error:", err);
    return { success: false, error: err.message || "Failed to delete user account." };
  }
}

// 5. Password reset
export async function resetUserPasswordAction(userId: string, newPassword?: string) {
  try {
    await verifyProfileAccess("user_management_access");

    if (!newPassword || newPassword.length < 6) {
      throw new Error("Password complexity failure. Passwords must be at least 6 characters.");
    }

    const db = getDb();
    const passwordHash = await hashPassword(newPassword);

    await db
      .prepare("UPDATE profiles SET password_hash = ?, updated_at = ? WHERE id = ?")
      .bind(passwordHash, Date.now(), userId)
      .run();

    return { success: true };
  } catch (err: any) {
    console.error("resetUserPasswordAction error:", err);
    return { success: false, error: err.message || "Failed to reset user password." };
  }
}
