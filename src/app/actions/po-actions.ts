"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { verifyProfileAccess, assertWriteAccess } from "@/lib/db/auth-helpers";
import { convertDates } from "@/lib/db/dates";
import type { PurchaseOrder, PurchaseOrderItem, PurchaseOrderStatus } from "@/types";

// 1. READ: Fetch all purchase orders with items, SKUs, and materials
export async function getPurchaseOrdersAction(): Promise<PurchaseOrder[]> {
  try {
    await verifyProfileAccess("purchase_orders_access");
    const db = getDb();

    const { results: orders } = await db
      .prepare("SELECT * FROM purchase_orders ORDER BY created_at DESC")
      .all<any>();

    const { results: items } = await db
      .prepare("SELECT * FROM purchase_orders_items ORDER BY created_at ASC")
      .all<any>();

    const { results: skus } = await db
      .prepare("SELECT s.*, m.* FROM skus s LEFT JOIN materials m ON s.material_id = m.id")
      .all<any>();

    const formattedPOs = (orders || []).map((po: any) => {
      const poItems = (items || [])
        .filter((item: any) => item.po_id === po.id)
        .map((item: any) => {
          const sku = (skus || []).find((s: any) => s.id === item.sku_id);
          return convertDates({
            ...item,
            sku: sku ? convertDates(sku) : null,
            material: sku ? convertDates(sku) : null,
          });
        });
      return convertDates({ ...po, items: poItems as PurchaseOrderItem[] });
    });

    return formattedPOs as PurchaseOrder[];
  } catch (err: any) {
    console.error("getPurchaseOrdersAction error:", err);
    throw new Error(err.message || "Failed to retrieve Purchase Orders procurement history log.");
  }
}

// 2. CREATE: Record purchase order
export async function createPurchaseOrderAction(formData: {
  po_code: string;
  supplier_name: string;
  delivery_date?: string;
  items: {
    sku_id: string;
    quantity_ordered: number;
    unit_price: number;
  }[];
}) {
  try {
    const auth = await verifyProfileAccess("purchase_orders_access");
    assertWriteAccess(auth.role);

    if (formData.items.length === 0) {
      throw new Error("Transaction Rejected. A Purchase Order must contain at least one item.");
    }

    const db = getDb();
    const now = Date.now();
    const poId = crypto.randomUUID();

    const totalAmount = formData.items.reduce(
      (sum, item) => sum + Number(item.quantity_ordered) * Number(item.unit_price),
      0
    );

    // A. Insert PO header
    await db
      .prepare(
        `INSERT INTO purchase_orders (id, po_code, supplier_name, order_date, delivery_date, status, total_amount, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        poId,
        formData.po_code.toUpperCase().trim(),
        formData.supplier_name.trim(),
        now,
        formData.delivery_date ? new Date(formData.delivery_date).getTime() : null,
        "draft",
        totalAmount,
        auth.userId,
        now,
        now
      )
      .run();

    // B. Insert items
    try {
      const insertItem = db.prepare(
        `INSERT INTO purchase_orders_items (id, po_id, sku_id, quantity_ordered, unit_price, quantity_received, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      );

      const batchStatements = formData.items.map((item) =>
        insertItem.bind(
          crypto.randomUUID(),
          poId,
          item.sku_id,
          item.quantity_ordered,
          item.unit_price,
          0,
          now
        )
      );

      await db.batch(batchStatements);
    } catch (loopError: any) {
      await db.prepare("DELETE FROM purchase_orders WHERE id = ?").bind(poId).run();
      throw loopError;
    }

    revalidatePath("/purchase-orders");
    return { success: true, poId };
  } catch (err: any) {
    console.error("createPurchaseOrderAction error:", err);
    return { success: false, error: err.message || "Failed to log Purchase Order." };
  }
}

// 3. UPDATE: Transition purchase order status
export async function updatePurchaseOrderStatusAction(poId: string, status: PurchaseOrderStatus) {
  try {
    const auth = await verifyProfileAccess("purchase_orders_access");
    assertWriteAccess(auth.role);
    const db = getDb();

    await db
      .prepare("UPDATE purchase_orders SET status = ?, updated_at = ? WHERE id = ?")
      .bind(status, Date.now(), poId)
      .run();

    revalidatePath("/purchase-orders");
    return { success: true };
  } catch (err: any) {
    console.error("updatePurchaseOrderStatusAction error:", err);
    return { success: false, error: err.message || "Failed to update Purchase Order status." };
  }
}

// 4. DELETE: Prune PO and cascade items
export async function deletePurchaseOrderAction(poId: string) {
  try {
    const auth = await verifyProfileAccess("purchase_orders_access");
    assertWriteAccess(auth.role);
    const db = getDb();

    await db.prepare("DELETE FROM purchase_orders WHERE id = ?").bind(poId).run();

    revalidatePath("/purchase-orders");
    return { success: true };
  } catch (err: any) {
    console.error("deletePurchaseOrderAction error:", err);
    return { success: false, error: err.message || "Failed to purge Purchase Order logs." };
  }
}
