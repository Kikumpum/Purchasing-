import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { readSupabaseConfig } from "./config";

export async function createSupabaseServerClient({ writableCookies = false } = {}) {
  const { config } = readSupabaseConfig(process.env);
  if (!config) throw new Error("Konfigurasi Supabase diperlukan.");
  const cookieStore = await cookies();

  return createServerClient(config.url, config.key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (updates: { name: string; value: string; options: CookieOptions }[]) => {
        if (!writableCookies) return;
        for (const { name, value, options } of updates) {
          cookieStore.set(name, value, options);
        }
      },
    },
  });
}
