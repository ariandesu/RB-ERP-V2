"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { verifyProfileAccess, assertWriteAccess } from "@/lib/db/auth-helpers";
import { convertDates } from "@/lib/db/dates";
import type { InwardShipment, InwardItem, QualityCheckStatus } from "@/types";

// 1. READ: Fetch all inward shipments with items, SKUs, and materials
export async function getInwardShipmentsAction(): Promise<InwardShipment[]> {
  try {
    await verifyProfileAccess("goods_inward_access");
    const db = getDb();

    const { results: shipments } = await db
      .prepare("SELECT * FROM goods_inward ORDER BY created_at DESC")
      .all<any>();

    const { results: items } = await db
      .prepare("SELECT * FROM goods_inward_items ORDER BY created_at ASC")
      .all<any>();

    const { results: skus } = await db
      .prepare("SELECT s.*, m.* FROM skus s LEFT JOIN materials m ON s.material_id = m.id")
      .all<any>();

    const formattedShipments = (shipments || []).map((sh: any) => {
      const shipmentItems = (items || [])
        .filter((item: any) => item.inward_id === sh.id)
        .map((item: any) => {
          const sku = (skus || []).find((s: any) => s.id === item.sku_id);
          return convertDates({
            ...item,
            sku: sku ? convertDates(sku) : null,
            material: sku ? extractMaterialFromJoinedRow(convertDates(sku)) : null,
          });
        });
      return convertDates({ ...sh, items: shipmentItems as InwardItem[] });
    });

    return formattedShipments as InwardShipment[];
  } catch (err: any) {
    console.error("getInwardShipmentsAction error:", err);
    throw new Error(err.message || "Failed to retrieve Goods Inward history log.");
  }
}

function extractMaterialFromJoinedRow(row: any) {
  return {
    id: row.id, // sku.id — will be replaced by sku.material reference
    code: row.code,
    name: row.name,
    category: row.category,
    uom: row.uom,
    description: row.description,
    supplier_name: row.supplier_name,
    composition: row.composition,
    weight_gsm: row.weight_gsm,
    width_inches: row.width_inches,
    yarn_count: row.yarn_count,
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// 2. CREATE: Record inbound shipment and update SKU stock
export async function createInwardShipmentAction(formData: {
  inward_code: string;
  supplier_name: string;
  invoice_no?: string;
  warehouse_id: string;
  received_date: string;
  items: {
    sku_id: string;
    lot_number: string;
    quantity_received: number;
    unit_price?: number;
    quality_status: QualityCheckStatus;
    remarks?: string;
  }[];
}) {
  try {
    const auth = await verifyProfileAccess("goods_inward_access");
    assertWriteAccess(auth.role);

    if (formData.items.length === 0) {
      throw new Error("Transaction Rejected. An inward shipment must contain at least one received item.");
    }

    const db = getDb();
    const now = Date.now();
    const shipmentId = crypto.randomUUID();

    // A. Insert shipment header
    await db
      .prepare(
        `INSERT INTO goods_inward (id, inward_code, supplier_name, invoice_no, warehouse_id, received_date, received_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        shipmentId,
        formData.inward_code.toUpperCase().trim(),
        formData.supplier_name.trim(),
        formData.invoice_no?.trim() || null,
        formData.warehouse_id,
        new Date(formData.received_date).getTime(),
        auth.userId,
        now,
        now
      )
      .run();

    // B. Process items and update stock
    try {
      for (const item of formData.items) {
        // Get current stock
        const skuRecord = await db
          .prepare("SELECT quantity_on_hand FROM skus WHERE id = ?")
          .bind(item.sku_id)
          .first<{ quantity_on_hand: number }>();

        if (!skuRecord) {
          throw new Error(`SKU identification error: unable to retrieve current balances.`);
        }

        // Increment stock
        const updatedQty = Number(skuRecord.quantity_on_hand) + Number(item.quantity_received);
        await db
          .prepare("UPDATE skus SET quantity_on_hand = ?, updated_at = ? WHERE id = ?")
          .bind(updatedQty, now, item.sku_id)
          .run();
      }

      // Batch insert items
      const insertItem = db.prepare(
        `INSERT INTO goods_inward_items (id, inward_id, sku_id, lot_number, quantity_received, unit_price, quality_status, remarks, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );

      const batchStatements = formData.items.map((item) =>
        insertItem.bind(
          crypto.randomUUID(),
          shipmentId,
          item.sku_id,
          item.lot_number.toUpperCase().trim(),
          item.quantity_received,
          item.unit_price || null,
          item.quality_status,
          item.remarks?.trim() || null,
          now
        )
      );

      await db.batch(batchStatements);
    } catch (loopError: any) {
      // Rollback header if items fail
      await db.prepare("DELETE FROM goods_inward WHERE id = ?").bind(shipmentId).run();
      throw loopError;
    }

    revalidatePath("/inward");
    revalidatePath("/materials");
    return { success: true, shipmentId };
  } catch (err: any) {
    console.error("createInwardShipmentAction error:", err);
    return { success: false, error: err.message || "Failed to log Inbound shipment." };
  }
}

// 3. DELETE: Prune shipment and rollback stock
export async function deleteInwardShipmentAction(shipmentId: string) {
  try {
    const auth = await verifyProfileAccess("goods_inward_access");
    assertWriteAccess(auth.role);
    const db = getDb();

    // Fetch items to rollback stock
    const { results: items } = await db
      .prepare("SELECT sku_id, quantity_received FROM goods_inward_items WHERE inward_id = ?")
      .bind(shipmentId)
      .all<any>();

    // Rollback stock
    if (items && items.length > 0) {
      for (const item of items) {
        const skuRecord = await db
          .prepare("SELECT quantity_on_hand FROM skus WHERE id = ?")
          .bind(item.sku_id)
          .first<{ quantity_on_hand: number }>();

        if (skuRecord) {
          const decrementedQty = Math.max(0, Number(skuRecord.quantity_on_hand) - Number(item.quantity_received));
          await db
            .prepare("UPDATE skus SET quantity_on_hand = ?, updated_at = ? WHERE id = ?")
            .bind(decrementedQty, Date.now(), item.sku_id)
            .run();
        }
      }
    }

    // Delete header (cascade deletes items)
    await db.prepare("DELETE FROM goods_inward WHERE id = ?").bind(shipmentId).run();

    revalidatePath("/inward");
    revalidatePath("/materials");
    return { success: true };
  } catch (err: any) {
    console.error("deleteInwardShipmentAction error:", err);
    return { success: false, error: err.message || "Failed to rollback Inward shipment logs." };
  }
}
