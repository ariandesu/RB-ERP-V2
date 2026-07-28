import type { Material } from "@/types";

export function lookupSkuByCode(
  materials: Material[],
  code: string
): { sku: any; material: Material } | null {
  const trimmed = code.trim().toUpperCase();
  for (const material of materials) {
    const sku = (material.skus || []).find(
      (s) =>
        s.sku_code.toUpperCase() === trimmed ||
        s.sku_code.toUpperCase().endsWith(trimmed)
    );
    if (sku) return { sku, material };
  }
  return null;
}
