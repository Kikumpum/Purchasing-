import type { SupabaseConfiguration } from "./config";

export async function checkSupabaseConnection(config: SupabaseConfiguration) {
  try {
    const response = await fetch(new URL("/auth/v1/settings", config.url), {
      headers: { apikey: config.key },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) return false;
    const settings: unknown = await response.json();
    return typeof settings === "object" && settings !== null && "external" in settings;
  } catch {
    return false;
  }
}
