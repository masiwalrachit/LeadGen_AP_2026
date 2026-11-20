import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST only: a GET link could be triggered by a prefetch or a third-party page and log the user out.
export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/signup", request.url), { status: 303 });
}
