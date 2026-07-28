import { cache } from "react";
import { cookies } from "next/headers";
import { verifyJwt, type JwtPayload } from "@/lib/auth/jwt";
import type { UserProfile } from "@/types";

export interface CachedProfileResult {
  user: { id: string; email: string } | null;
  profile: UserProfile | null;
}

function jwtToProfile(payload: JwtPayload): UserProfile {
  let warehouseAccess: string[] = [];
  try {
    warehouseAccess = JSON.parse(payload.warehouse_access || "[]");
  } catch {}

  return {
    id: payload.sub,
    email: payload.email,
    name: payload.name,
    role: payload.role as UserProfile["role"],
    status: payload.status as UserProfile["status"] || "active",
    warehouse_access: warehouseAccess,
    dashboard_access: !!payload.dashboard_access,
    materials_access: !!payload.materials_access,
    goods_inward_access: !!payload.goods_inward_access,
    goods_outward_access: !!payload.goods_outward_access,
    purchase_orders_access: !!payload.purchase_orders_access,
    reports_access: !!payload.reports_access,
    analytics_access: !!payload.analytics_access,
    settings_access: !!payload.settings_access,
    user_management_access: !!payload.user_management_access,
    created_at: "",
    updated_at: "",
  };
}

export const getCachedProfile = cache(async (): Promise<CachedProfileResult> => {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("__session")?.value;
    if (!token) return { user: null, profile: null };

    const payload = await verifyJwt(token);
    const profile = jwtToProfile(payload);

    return {
      user: { id: payload.sub, email: payload.email },
      profile,
    };
  } catch {
    return { user: null, profile: null };
  }
});
