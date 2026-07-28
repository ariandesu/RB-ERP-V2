import { SignJWT, jwtVerify } from "jose";

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET environment variable is not set");
  return new TextEncoder().encode(secret);
}

export interface JwtPayload {
  sub: string;
  role: string;
  email: string;
  name: string;
  status: string;
  warehouse_access: string;
  dashboard_access: number;
  materials_access: number;
  goods_inward_access: number;
  goods_outward_access: number;
  purchase_orders_access: number;
  reports_access: number;
  analytics_access: number;
  settings_access: number;
  user_management_access: number;
}

export async function signJwt(payload: JwtPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .setIssuer("rosebally-erp")
    .sign(getSecret());
}

export async function verifyJwt(token: string): Promise<JwtPayload> {
  const { payload } = await jwtVerify(token, getSecret(), {
    issuer: "rosebally-erp",
  });
  return payload as unknown as JwtPayload;
}
