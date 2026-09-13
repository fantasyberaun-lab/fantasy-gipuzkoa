import { createBrowserClient } from "@supabase/ssr";

// Úsalo en componentes "use client". Requiere NEXT_PUBLIC_SUPABASE_URL
// y NEXT_PUBLIC_SUPABASE_ANON_KEY en el entorno (ver .env.example).
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
