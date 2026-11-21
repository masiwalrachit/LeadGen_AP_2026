import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { usernameInitial, usernameSchema } from "@/lib/auth/username";

export type WorkspaceAccess =
  | { kind: "authenticated"; workspaceId: string | null }
  | { kind: "database-missing" };

export async function getWorkspaceAccess(): Promise<WorkspaceAccess> {
  const supabase = await createClient();
  const { data: claimData } = await supabase.auth.getClaims();
  if (!claimData?.claims?.sub) redirect("/signup");

  const { data, error } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", claimData.claims.sub)
    .order("joined_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (error.code === "PGRST205" || error.code === "42P01" || error.message.includes("workspace_members")) {
      return { kind: "database-missing" };
    }
    throw new Error(`Workspace lookup failed: ${error.message}`);
  }

  return { kind: "authenticated", workspaceId: data?.workspace_id ?? null };
}

export async function requireWorkspace() {
  const access = await getWorkspaceAccess();
  if (access.kind === "database-missing") redirect("/setup/database");
  if (!access.workspaceId) redirect("/onboarding");
  return access.workspaceId;
}

export type WorkspaceContext = {
  workspaceId: string;
  workspaceName: string;
  username: string;
  userInitial: string;
};

export async function getWorkspaceContext(): Promise<WorkspaceContext> {
  const workspaceId = await requireWorkspace();
  const supabase = await createClient();
  const { data: claimData } = await supabase.auth.getClaims();
  const userId = claimData?.claims?.sub;

  if (!userId) redirect("/signup");

  const [{ data: workspace, error: workspaceError }, { data: profile, error: profileError }] = await Promise.all([
    supabase.from("workspaces").select("name").eq("id", workspaceId).single(),
    supabase.from("profiles").select("*").eq("id", userId).single(),
  ]);

  if (workspaceError) throw new Error(`Workspace details failed to load: ${workspaceError.message}`);
  if (profileError) throw new Error(`Profile details failed to load: ${profileError.message}`);

  const metadata = claimData.claims.user_metadata as Record<string, unknown> | undefined;
  const emailPrefix = typeof claimData.claims.email === "string" ? claimData.claims.email.split("@")[0] : undefined;
  const username = [profile?.username, metadata?.username, emailPrefix, "member"]
    .map((candidate) => usernameSchema.safeParse(candidate))
    .find((result) => result.success)?.data ?? "member";

  return {
    workspaceId,
    workspaceName: workspace.name,
    username,
    userInitial: usernameInitial(username),
  };
}
