import { NextResponse } from "next/server";
import { z } from "zod";
import { usernameSchema } from "@/lib/auth/username";
import { createClient } from "@/lib/supabase/server";

const createSchema = z.object({ action: z.literal("create"), username: usernameSchema, name: z.string().trim().min(2).max(120), website: z.union([z.url(), z.literal("")]), location: z.string().trim().min(2).max(150), services: z.array(z.enum(["new-website", "redesign", "ecommerce", "maintenance"])).min(1) });
const joinSchema = z.object({ action: z.literal("join"), username: usernameSchema, code: z.string().trim().min(5).max(20) });
const requestSchema = z.discriminatedUnion("action", [createSchema, joinSchema]);

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) return NextResponse.json({ error: "Sign in before setting up a workspace." }, { status: 401 });
  // The app treats a user as belonging to one workspace; creating or joining a second one would
  // make which workspace they land in ambiguous.
  const { data: existing, error: existingError } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", claims.claims.sub)
    .limit(1)
    .maybeSingle();
  if (existingError) return NextResponse.json({ error: "Could not check your workspace. Try again." }, { status: 500 });
  if (existing) return NextResponse.json({ error: "You already belong to a workspace." }, { status: 409 });
  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Check the workspace details and try again." }, { status: 400 });
  const { data, error } = parsed.data.action === "create"
    ? await supabase.rpc("create_workspace", { profile_username: parsed.data.username, workspace_name: parsed.data.name, workspace_website: parsed.data.website, workspace_location: parsed.data.location, workspace_services: parsed.data.services })
    : await supabase.rpc("join_workspace", { profile_username: parsed.data.username, workspace_code: parsed.data.code });
  if (error) return NextResponse.json({ error: error.code === "PGRST202" ? "Workspace database migration has not been applied yet." : error.message }, { status: 400 });
  return NextResponse.json({ workspace: data });
}
