import { getCloudflareContext } from "@opennextjs/cloudflare";
import { cache } from "react";
import type { D1Database } from "@cloudflare/workers-types";

export const getDb = cache(() => {
  const { env } = getCloudflareContext();
  return (env as Record<string, unknown>).DB as unknown as D1Database;
});

export const getDbAsync = cache(async () => {
  const { env } = await getCloudflareContext({ async: true });
  return (env as Record<string, unknown>).DB as unknown as D1Database;
});
