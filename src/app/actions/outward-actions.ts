"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { verifyProfileAccess, assertWriteAccess } from "@/lib/db/auth-helpers";
import { convertDates } from "@/lib/db/dates";
import type { OutwardShipment, OutwardItem } from "@/types";

// 1. READ: Fetch all outward shipments with items, SKUs, and materials
export async function getOutwardShipmentsAction(): Promise<OutwardShipment[]> {
  try {
    await verifyProfileAccess("goods_outward_access");
    const db = getDb();

    const { results: shipments } = await db
      .prepare("SELECT * FROM goods_outward ORDER BY created_at DESC")
      .all<any>();

    const { results: items } = await db
      .prepare("SELECT * FROM goods_outward_items ORDER BY created_at ASC")
      .all<any>();

    const { results: skus } = await db
      .prepare("SELECT s.*, m.* FROM skus s LEFT JOIN materials m ON s.material_id = m.id")
      .all<any>();

    const formattedShipments = (shipments || []).map((sh: any) => {
      const shipmentItems = (items || [])
        .filter((item: any) => item.outward_id === sh.id)
        .map((item: any) => {
          const sku = (skus || []).find((s: any) => s.id === item.sku_id);
          return convertDates({
            ...item,
            sku: sku ? convertDates(sku) : null,
            material: sku ? {
              id: sku.material_id,
              code: sku.code,
              name: sku.name,
              category: sku.category,
            } : null,
          });
        });
      return convertDates({ ...sh, items: shipmentItems as OutwardItem[] });
    });

    return formattedShipments as OutwardShipment[];
  } catch (err: any) {
    console.error("getOutwardShipmentsAction error:", err);
    throw new Error(err.message || "Failed to retrieve Goods Outward history log.");
  }
}

// 2. CREATE: Record outbound dispatch with anti-negative stock check
export async function createOutwardShipmentAction(formData: {
  outward_code: string;
  customer_name: string;
  order_no?: string;
  warehouse_id: string;
  dispatched_date: string;
  items: {
    sku_id: string;
    lot_number: string;
    quantity_dispatched: number;
    remarks?: string;
  }[];
}) {
  try {
    const auth = await verifyProfileAccess("goods_outward_access");
    assertWriteAccess(auth.role);

    if (formData.items.length === 0) {
      throw new Error("Transaction Rejected. An outward shipment must contain at least one dispatched item.");
    }

    const db = getDb();
    const now = Date.now();
    const shipmentId = crypto.randomUUID();

    // A. Insert shipment header
    await db
      .prepare(
        `INSERT INTO goods_outward (id, outward_code, customer_name, order_no, warehouse_id, dispatched_date, dispatched_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        shipmentId,
        formData.outward_code.toUpperCase().trim(),
        formData.customer_name.trim(),
        formData.order_no?.trim() || null,
        formData.warehouse_id,
        new Date(formData.dispatched_date).getTime(),
        auth.userId,
        now,
        now
      )
      .run();

    // B. Process items, validate stock, and update
    try {
      for (const item of formData.items) {
        const skuRecord = await db
          .prepare("SELECT quantity_on_hand, sku_code FROM skus WHERE id = ?")
          .bind(item.sku_id)
          .first<{ quantity_on_hand: number; sku_code: string }>();

        if (!skuRecord) {
          throw new Error(`SKU identification error: unable to retrieve current balances.`);
        }

        const currentQty = Number(skuRecord.quantity_on_hand);
        const requestQty = Number(item.quantity_dispatched);

        if (currentQty < requestQty) {
          throw new Error(
            `Insufficient inventory for SKU: ${skuRecord.sku_code}.`
          );
        }

        // Decrement stock
        await db
          .prepare("UPDATE skus SET quantity_on_hand = ?, updated_at = ? WHERE id = ?")
          .bind(currentQty - requestQty, now, item.sku_id)
          .run();
      }

      // Batch insert items
      const insertItem = db.prepare(
        `INSERT INTO goods_outward_items (id, outward_id, sku_id, lot_number, quantity_dispatched, remarks, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      );

      const batchStatements = formData.items.map((item) =>
        insertItem.bind(
          crypto.randomUUID(),
          shipmentId,
          item.sku_id,
          item.lot_number.toUpperCase().trim(),
          item.quantity_dispatched,
          item.remarks?.trim() || null,
          now
        )
      );

      await db.batch(batchStatements);
    } catch (loopError: any) {
      // Rollback header if items fail
      await db.prepare("DELETE FROM goods_outward WHERE id = ?").bind(shipmentId).run();
      throw loopError;
    }

    revalidatePath("/outward");
    revalidatePath("/materials");
    return { success: true, shipmentId };
  } catch (err: any) {
    console.error("createOutwardShipmentAction error:", err);
    return { success: false, error: err.message || "Failed to log Outward shipment." };
  }
}

// 3. DELETE: Prune dispatch log and restore stock
export async function deleteOutwardShipmentAction(shipmentId: string) {
  try {
    const auth = await verifyProfileAccess("goods_outward_access");
    assertWriteAccess(auth.role);
    const db = getDb();

    const { results: items } = await db
      .prepare("SELECT sku_id, quantity_dispatched FROM goods_outward_items WHERE outward_id = ?")
      .bind(shipmentId)
      .all<any>();

    if (items && items.length > 0) {
      for (const item of items) {
        const skuRecord = await db
          .prepare("SELECT quantity_on_hand FROM skus WHERE id = ?")
          .bind(item.sku_id)
          .first<{ quantity_on_hand: number }>();

        if (skuRecord) {
          await db
            .prepare("UPDATE skus SET quantity_on_hand = ?, updated_at = ? WHERE id = ?")
            .bind(Number(skuRecord.quantity_on_hand) + Number(item.quantity_dispatched), Date.now(), item.sku_id)
            .run();
        }
      }
    }

    await db.prepare("DELETE FROM goods_outward WHERE id = ?").bind(shipmentId).run();

    revalidatePath("/outward");
    revalidatePath("/materials");
    return { success: true };
  } catch (err: any) {
    console.error("deleteOutwardShipmentAction error:", err);
    return { success: false, error: err.message || "Failed to rollback Outward shipment logs." };
  }
}
