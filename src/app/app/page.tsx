import { redirect } from "next/navigation";
import { getWorkspaceAccess } from "@/lib/auth/workspace";

export default async function AppEntryPage() {
  const access = await getWorkspaceAccess();
  if (access.kind === "database-missing") redirect("/setup/database");
  redirect(access.workspaceId ? "/dashboard" : "/onboarding");
}
