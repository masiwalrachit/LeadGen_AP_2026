import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getWorkspaceAccess } from "@/lib/auth/workspace";

export const metadata: Metadata = { title: "Set up your workspace" };

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const access = await getWorkspaceAccess();
  if (access.kind === "database-missing") redirect("/setup/database");
  if (access.workspaceId) redirect("/dashboard");
  return children;
}
