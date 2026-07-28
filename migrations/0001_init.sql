-- Rosebally ERP V2 — D1 Database Schema
-- Prerequisites: npx wrangler d1 create rosebally-erp-v2
-- Apply: npx wrangler d1 migrations apply rosebally-erp-v2

-- ============================================
-- CUSTOM ENUMS (implemented as CHECK constraints)
-- ============================================

-- ============================================
-- TABLE: profiles (supabase auth.users replacement)
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'staff' CHECK(role IN ('super_admin','admin','warehouse_manager','staff','viewer')),
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive')),
  warehouse_access TEXT NOT NULL DEFAULT '[]',
  dashboard_access INTEGER NOT NULL DEFAULT 1,
  materials_access INTEGER NOT NULL DEFAULT 0,
  goods_inward_access INTEGER NOT NULL DEFAULT 0,
  goods_outward_access INTEGER NOT NULL DEFAULT 0,
  purchase_orders_access INTEGER NOT NULL DEFAULT 0,
  reports_access INTEGER NOT NULL DEFAULT 0,
  analytics_access INTEGER NOT NULL DEFAULT 0,
  settings_access INTEGER NOT NULL DEFAULT 0,
  user_management_access INTEGER NOT NULL DEFAULT 0,
  password_hash TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
) STRICT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- ============================================
-- TABLE: sessions (JWT session tracking for revocation)
-- ============================================
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
) STRICT;

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);

-- ============================================
-- TABLE: materials
-- ============================================
CREATE TABLE IF NOT EXISTS materials (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  uom TEXT NOT NULL,
  description TEXT DEFAULT '',
  supplier_name TEXT DEFAULT '',
  composition TEXT DEFAULT '',
  weight_gsm INTEGER DEFAULT 0,
  width_inches REAL DEFAULT 0,
  yarn_count TEXT DEFAULT '',
  created_by TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL
) STRICT;

CREATE INDEX IF NOT EXISTS idx_materials_category ON materials(category);
CREATE INDEX IF NOT EXISTS idx_materials_code ON materials(code);

-- ============================================
-- TABLE: skus (SKU variants per material)
-- ============================================
CREATE TABLE IF NOT EXISTS skus (
  id TEXT PRIMARY KEY,
  material_id TEXT NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  sku_code TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT '',
  size TEXT DEFAULT '',
  quantity_on_hand REAL NOT NULL DEFAULT 0,
  quantity_allocated REAL NOT NULL DEFAULT 0,
  min_stock_level REAL NOT NULL DEFAULT 0,
  alert_on_low_stock INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
) STRICT;

CREATE INDEX IF NOT EXISTS idx_skus_material_id ON skus(material_id);
CREATE INDEX IF NOT EXISTS idx_skus_sku_code ON skus(sku_code);
CREATE INDEX IF NOT EXISTS idx_skus_low_stock ON skus(alert_on_low_stock, quantity_on_hand, min_stock_level);

-- ============================================
-- TABLE: goods_inward
-- ============================================
CREATE TABLE IF NOT EXISTS goods_inward (
  id TEXT PRIMARY KEY,
  inward_code TEXT NOT NULL UNIQUE,
  supplier_name TEXT NOT NULL,
  invoice_no TEXT DEFAULT '',
  warehouse_id TEXT DEFAULT '',
  received_date INTEGER NOT NULL,
  received_by TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (received_by) REFERENCES profiles(id) ON DELETE SET NULL
) STRICT;

CREATE INDEX IF NOT EXISTS idx_goods_inward_code ON goods_inward(inward_code);
CREATE INDEX IF NOT EXISTS idx_goods_inward_date ON goods_inward(received_date);

-- ============================================
-- TABLE: goods_inward_items
-- ============================================
CREATE TABLE IF NOT EXISTS goods_inward_items (
  id TEXT PRIMARY KEY,
  inward_id TEXT NOT NULL REFERENCES goods_inward(id) ON DELETE CASCADE,
  sku_id TEXT NOT NULL REFERENCES skus(id) ON DELETE CASCADE,
  lot_number TEXT DEFAULT '',
  quantity_received REAL NOT NULL DEFAULT 0,
  unit_price REAL NOT NULL DEFAULT 0,
  quality_status TEXT DEFAULT 'passed' CHECK(quality_status IN ('passed','quarantine','failed')),
  remarks TEXT DEFAULT '',
  created_at INTEGER NOT NULL
) STRICT;

CREATE INDEX IF NOT EXISTS idx_goods_inward_items_inward_id ON goods_inward_items(inward_id);
CREATE INDEX IF NOT EXISTS idx_goods_inward_items_sku_id ON goods_inward_items(sku_id);

-- ============================================
-- TABLE: goods_outward
-- ============================================
CREATE TABLE IF NOT EXISTS goods_outward (
  id TEXT PRIMARY KEY,
  outward_code TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  order_no TEXT DEFAULT '',
  warehouse_id TEXT DEFAULT '',
  dispatched_date INTEGER NOT NULL,
  dispatched_by TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (dispatched_by) REFERENCES profiles(id) ON DELETE SET NULL
) STRICT;

CREATE INDEX IF NOT EXISTS idx_goods_outward_code ON goods_outward(outward_code);

-- ============================================
-- TABLE: goods_outward_items
-- ============================================
CREATE TABLE IF NOT EXISTS goods_outward_items (
  id TEXT PRIMARY KEY,
  outward_id TEXT NOT NULL REFERENCES goods_outward(id) ON DELETE CASCADE,
  sku_id TEXT NOT NULL REFERENCES skus(id) ON DELETE CASCADE,
  lot_number TEXT DEFAULT '',
  quantity_dispatched REAL NOT NULL DEFAULT 0,
  remarks TEXT DEFAULT '',
  created_at INTEGER NOT NULL
) STRICT;

CREATE INDEX IF NOT EXISTS idx_goods_outward_items_outward_id ON goods_outward_items(outward_id);
CREATE INDEX IF NOT EXISTS idx_goods_outward_items_sku_id ON goods_outward_items(sku_id);

-- ============================================
-- TABLE: purchase_orders
-- ============================================
CREATE TABLE IF NOT EXISTS purchase_orders (
  id TEXT PRIMARY KEY,
  po_code TEXT NOT NULL UNIQUE,
  supplier_name TEXT NOT NULL,
  order_date INTEGER NOT NULL,
  delivery_date INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','pending','completed','cancelled')),
  total_amount REAL NOT NULL DEFAULT 0,
  created_by TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL
) STRICT;

CREATE INDEX IF NOT EXISTS idx_purchase_orders_code ON purchase_orders(po_code);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);

-- ============================================
-- TABLE: purchase_orders_items
-- ============================================
CREATE TABLE IF NOT EXISTS purchase_orders_items (
  id TEXT PRIMARY KEY,
  po_id TEXT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  sku_id TEXT NOT NULL REFERENCES skus(id) ON DELETE CASCADE,
  quantity_ordered REAL NOT NULL DEFAULT 0,
  unit_price REAL NOT NULL DEFAULT 0,
  quantity_received REAL NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
) STRICT;

CREATE INDEX IF NOT EXISTS idx_purchase_orders_items_po_id ON purchase_orders_items(po_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_items_sku_id ON purchase_orders_items(sku_id);
