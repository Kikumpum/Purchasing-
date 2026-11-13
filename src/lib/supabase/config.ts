import { z } from "zod";

const supabaseUrl = z.string().refine((value) => {
  const url = URL.parse(value);
  if (!url) return false;
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  return (url.protocol === "https:" || (local && url.protocol === "http:")) &&
    url.pathname === "/" && !url.username && !url.password && !url.search && !url.hash;
});

const publicKey = z.string().refine((value) =>
  /^sb_publishable_[A-Za-z0-9_-]+$/.test(value) || isLegacyAnonKey(value),
);

function isLegacyAnonKey(value: string) {
  const parts = value.split(".");
  if (parts.length !== 3 || parts.some((part) => !/^[A-Za-z0-9_-]+$/.test(part))) return false;
  try {
    return JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"))).role === "anon";
  } catch {
    return false;
  }
}

export type SupabaseConfiguration = {
  url: string;
  key: string;
};

export function readSupabaseConfig(env: Record<string, string | undefined>) {
  const urlValue = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const keyValue = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  const url = supabaseUrl.safeParse(urlValue);
  const key = publicKey.safeParse(keyValue);
  const fields = {
    url: url.success ? "valid" : urlValue ? "invalid" : "missing",
    key: key.success ? "valid" : keyValue ? "invalid" : "missing",
  } as const;

  return {
    fields,
    config: url.success && key.success ? { url: url.data, key: key.data } : null,
  };
}

export const localEnvTemplate = "NEXT_PUBLIC_SUPABASE_URL=\nNEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=";
