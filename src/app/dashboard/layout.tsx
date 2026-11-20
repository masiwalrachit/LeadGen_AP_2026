import { requireWorkspace } from "@/lib/auth/workspace";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireWorkspace();
  return children;
}
