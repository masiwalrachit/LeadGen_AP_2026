/**
 * Demo mode runs the whole frontend on illustrative local data when no Supabase project is configured
 * (Checkpoint 0 decision). NEXT_PUBLIC_* values are inlined at build time, so this works on the server
 * and in the browser. With Supabase configured, the real auth and API flow is used unchanged.
 */
export function isDemoMode(): boolean {
  return !(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
}
