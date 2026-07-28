"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { verifyProfileAccess, assertWriteAccess } from "@/lib/db/auth-helpers";
import { convertDates } from "@/lib/db/dates";
import type { Material, SKU, MaterialCategory, MaterialUom } from "@/types";

// 1. READ: Fetch all materials with their nested SKU variants
export async function getMaterialsAction(): Promise<Material[]> {
  try {
    await verifyProfileAccess("materials_access");
    const db = getDb();

    const { results: materials } = await db
      .prepare("SELECT * FROM materials ORDER BY created_at DESC")
      .all<any>();

    const { results: skus } = await db
      .prepare("SELECT * FROM skus ORDER BY sku_code ASC")
      .all<any>();

    const formattedMaterials = (materials || []).map((material: any) => {
      const materialSkus = (skus || [])
        .filter((sku: any) => sku.material_id === material.id)
        .map((sku: any) => convertDates(sku));
      return convertDates({ ...material, skus: materialSkus as SKU[] });
    });

    return formattedMaterials as Material[];
  } catch (err: any) {
    console.error("getMaterialsAction error:", err);
    throw new Error(err.message || "Failed to retrieve materials master catalog.");
  }
}

// 2. CREATE: Register material and auto-generate SKU variants
export async function createMaterialAction(formData: {
  code: string;
  name: string;
  category: MaterialCategory;
  uom: MaterialUom;
  description?: string;
  supplier_name?: string;
  composition?: string;
  weight_gsm?: number;
  width_inches?: number;
  yarn_count?: string;
  variants: {
    colors: string[];
    sizes: string[];
    min_stock_level: number;
    alert_on_low_stock: boolean;
  };
}) {
  try {
    const auth = await verifyProfileAccess("materials_access");
    assertWriteAccess(auth.role);
    const db = getDb();
    const now = Date.now();
    const materialId = crypto.randomUUID();

    const colors =
      formData.variants.colors.length > 0 ? formData.variants.colors : ["STANDARD"];
    const sizes =
      formData.variants.sizes.length > 0 ? formData.variants.sizes : ["FREE"];

    // A. Insert core material details
    const insertResult = await db
      .prepare(
        `INSERT INTO materials (id, code, name, category, uom, description, supplier_name, composition, weight_gsm, width_inches, yarn_count, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        materialId,
        formData.code.toUpperCase().trim(),
        formData.name.trim(),
        formData.category,
        formData.uom,
        formData.description?.trim() || null,
        formData.supplier_name?.trim() || null,
        formData.composition?.trim() || null,
        formData.weight_gsm || null,
        formData.width_inches || null,
        formData.yarn_count?.trim() || null,
        auth.userId,
        now,
        now
      )
      .run();

    // B. Generate SKU variants
    const skusToInsert: any[] = [];
    for (const color of colors) {
      for (const size of sizes) {
        const cleanColor = color.toUpperCase().replace(/\s+/g, "");
        const cleanSize = size.toUpperCase().replace(/\s+/g, "");
        const skuCode = `${formData.code.toUpperCase().trim()}-${cleanColor}-${cleanSize}`;

        skusToInsert.push({
          id: crypto.randomUUID(),
          material_id: materialId,
          sku_code: skuCode,
          color: color.trim(),
          size: size.trim(),
          quantity_on_hand: 0,
          quantity_allocated: 0,
          min_stock_level: formData.variants.min_stock_level,
          alert_on_low_stock: formData.variants.alert_on_low_stock ? 1 : 0,
          created_at: now,
          updated_at: now,
        });
      }
    }

    if (skusToInsert.length > 0) {
      const insertSku = db.prepare(
        `INSERT INTO skus (id, material_id, sku_code, color, size, quantity_on_hand, quantity_allocated, min_stock_level, alert_on_low_stock, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );

      const batchStatements = skusToInsert.map((sku) =>
        insertSku.bind(
          sku.id,
          sku.material_id,
          sku.sku_code,
          sku.color,
          sku.size,
          sku.quantity_on_hand,
          sku.quantity_allocated,
          sku.min_stock_level,
          sku.alert_on_low_stock,
          sku.created_at,
          sku.updated_at
        )
      );

      try {
        await db.batch(batchStatements);
      } catch (skuErr) {
        // Rollback material if SKU insert fails
        await db.prepare("DELETE FROM materials WHERE id = ?").bind(materialId).run();
        throw skuErr;
      }
    }

    revalidatePath("/materials");
    return { success: true, materialId };
  } catch (err: any) {
    console.error("createMaterialAction error:", err);
    return { success: false, error: err.message || "Failed to register material catalog card." };
  }
}

// 3. UPDATE: Modify specifications of an existing material
export async function updateMaterialAction(
  materialId: string,
  formData: {
    name: string;
    description?: string;
    supplier_name?: string;
    composition?: string;
    weight_gsm?: number;
    width_inches?: number;
    yarn_count?: string;
  }
) {
  try {
    const auth = await verifyProfileAccess("materials_access");
    assertWriteAccess(auth.role);
    const db = getDb();

    await db
      .prepare(
        `UPDATE materials SET name = ?, description = ?, supplier_name = ?, composition = ?, weight_gsm = ?, width_inches = ?, yarn_count = ?, updated_at = ? WHERE id = ?`
      )
      .bind(
        formData.name.trim(),
        formData.description?.trim() || null,
        formData.supplier_name?.trim() || null,
        formData.composition?.trim() || null,
        formData.weight_gsm || null,
        formData.width_inches || null,
        formData.yarn_count?.trim() || null,
        Date.now(),
        materialId
      )
      .run();

    revalidatePath("/materials");
    return { success: true };
  } catch (err: any) {
    console.error("updateMaterialAction error:", err);
    return { success: false, error: err.message || "Failed to update material details." };
  }
}

// 4. DELETE: Purge catalog and variant configurations cascade
export async function deleteMaterialAction(materialId: string) {
  try {
    const auth = await verifyProfileAccess("materials_access");
    assertWriteAccess(auth.role);
    const db = getDb();

    // Cascade delete handled by ON DELETE CASCADE in D1 schema
    await db.prepare("DELETE FROM materials WHERE id = ?").bind(materialId).run();

    revalidatePath("/materials");
    return { success: true };
  } catch (err: any) {
    console.error("deleteMaterialAction error:", err);
    return { success: false, error: err.message || "Failed to delete material from system." };
  }
}
