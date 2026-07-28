// Fields that store user-facing dates (not just timestamps)
const DATE_FIELDS = new Set([
  "received_date",
  "dispatched_date",
  "order_date",
  "delivery_date",
]);

// Fields that store timestamps
const TIMESTAMP_FIELDS = new Set([
  "created_at",
  "updated_at",
]);

export function convertDates(obj: any): any {
  if (!obj || typeof obj !== "object") return obj;
  const result = { ...obj };
  for (const key of Object.keys(result)) {
    const val = result[key];
    if (DATE_FIELDS.has(key) && typeof val === "number") {
      result[key] = new Date(val).toISOString().split("T")[0];
    } else if (TIMESTAMP_FIELDS.has(key) && typeof val === "number") {
      result[key] = new Date(val).toISOString();
    }
  }
  return result;
}
