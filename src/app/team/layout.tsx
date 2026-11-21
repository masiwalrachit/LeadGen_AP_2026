import { requireWorkspace } from "@/lib/auth/workspace";

export default async function TeamLayout({ children }: { children: React.ReactNode }) {
  await requireWorkspace();
  return children;
}
