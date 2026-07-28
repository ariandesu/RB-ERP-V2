-- Rosebally ERP V2 — Seed Data
-- Run: npx wrangler d1 execute rosebally-erp-v2 --local --file=scripts/seed.sql

-- User accounts:
--   admin@rosebally.com / admin1234   (super_admin)
--   manager@rosebally.com / manager1234 (warehouse_manager)
--   staff@rosebally.com / staff1234   (staff)

INSERT OR IGNORE INTO profiles (id, email, name, role, status, warehouse_access, dashboard_access, materials_access, goods_inward_access, goods_outward_access, purchase_orders_access, reports_access, analytics_access, settings_access, user_management_access, password_hash, created_at, updated_at)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'admin@rosebally.com',
  'Super Admin',
  'super_admin',
  'active',
  '["WH-01","WH-02","WH-03"]',
  1, 1, 1, 1, 1, 1, 1, 1, 1,
  'MeDN5hQYIeaTIFPN+9Ubjg==:ghAqlwQlH3Ge96j4D6e1pQOFg/tlYWgTtce6PkOg0jw=',
  1720000000000,
  1720000000000
);

INSERT OR IGNORE INTO profiles (id, email, name, role, status, warehouse_access, dashboard_access, materials_access, goods_inward_access, goods_outward_access, purchase_orders_access, reports_access, analytics_access, settings_access, user_management_access, password_hash, created_at, updated_at)
VALUES (
  'a0000000-0000-0000-0000-000000000002',
  'manager@rosebally.com',
  'Warehouse Manager',
  'warehouse_manager',
  'active',
  '["WH-01","WH-02"]',
  1, 1, 1, 1, 1, 1, 0, 0, 0,
  'pRndV0DOMX6MU7eJmalhkA==:1xGRn4jjtWk4wHFsaR2ddqwIRYPx2xS3R0vVBI9sJoY=',
  1720000000000,
  1720000000000
);

INSERT OR IGNORE INTO profiles (id, email, name, role, status, warehouse_access, dashboard_access, materials_access, goods_inward_access, goods_outward_access, purchase_orders_access, reports_access, analytics_access, settings_access, user_management_access, password_hash, created_at, updated_at)
VALUES (
  'a0000000-0000-0000-0000-000000000003',
  'staff@rosebally.com',
  'Staff User',
  'staff',
  'active',
  '["WH-01"]',
  1, 0, 1, 0, 0, 0, 0, 0, 0,
  'QctVCKkL07q+65tIeHAAAg==:YXxZzsEkrfxYfhS66sf50c0khcxNXM3mxhg4yJm2Rpw=',
  1720000000000,
  1720000000000
);
