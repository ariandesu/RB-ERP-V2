// Seed script for RB ERP V2
// Run with: npx wrangler d1 execute rosebally-erp-v2 --file=scripts/seed.sql
// Or for local dev: npx wrangler d1 execute rosebally-erp-v2 --local --file=scripts/seed.sql

import { hashPassword } from "../src/lib/auth/password";

async function generateSeedSQL() {
  const adminId = crypto.randomUUID();
  const managerId = crypto.randomUUID();
  const staffId = crypto.randomUUID();
  const now = Date.now();

  const adminHash = await hashPassword("admin1234");
  const managerHash = await hashPassword("manager1234");
  const staffHash = await hashPassword("staff1234");

  const sql = `
-- Seed data for Rosebally ERP V2
-- Generated via scripts/seed.ts (run "npx tsx scripts/seed.ts > scripts/seed.sql")

-- Super Admin
INSERT OR IGNORE INTO profiles (id, email, name, role, status, warehouse_access, dashboard_access, materials_access, goods_inward_access, goods_outward_access, purchase_orders_access, reports_access, analytics_access, settings_access, user_management_access, password_hash, created_at, updated_at)
VALUES ('${adminId}', 'admin@rosebally.com', 'Super Admin', 'super_admin', 'active', '["WH-01","WH-02","WH-03"]', 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, '${adminHash}', ${now}, ${now});

-- Warehouse Manager
INSERT OR IGNORE INTO profiles (id, email, name, role, status, warehouse_access, dashboard_access, materials_access, goods_inward_access, goods_outward_access, purchase_orders_access, reports_access, analytics_access, settings_access, user_management_access, password_hash, created_at, updated_at)
VALUES ('${managerId}', 'manager@rosebally.com', 'Warehouse Manager', 'warehouse_manager', 'active', '["WH-01","WH-02"]', 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, '${managerHash}', ${now}, ${now});

-- Staff
INSERT OR IGNORE INTO profiles (id, email, name, role, status, warehouse_access, dashboard_access, materials_access, goods_inward_access, goods_outward_access, purchase_orders_access, reports_access, analytics_access, settings_access, user_management_access, password_hash, created_at, updated_at)
VALUES ('${staffId}', 'staff@rosebally.com', 'Staff User', 'staff', 'active', '["WH-01"]', 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, '${staffHash}', ${now}, ${now});
`;

  console.log(sql);
}

console.log("-- Rosebally ERP V2 Seed Data");
console.log(`-- Generated at: ${new Date().toISOString()}`);
console.log("");

generateSeedSQL().then(() => {
  console.log("-- Seed SQL generated successfully");
});
