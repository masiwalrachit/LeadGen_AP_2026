import { getWorkspaceContext } from "@/lib/auth/workspace";
import { AppShell } from "@/components/shell/app-shell";
import { leadsByScore } from "@/features/demo/data";

/** Every signed-in workspace page (dashboard, leads, lead detail) shares this shell and access check. */
export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const { workspaceName, username, userInitial } = await getWorkspaceContext();
  return (
    <AppShell workspaceName={workspaceName} username={username} userInitial={userInitial} leadCount={leadsByScore().length}>
      {children}
    </AppShell>
  );
}
