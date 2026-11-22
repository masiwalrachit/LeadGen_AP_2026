import { requireWorkspace } from "@/lib/auth/workspace";

export default async function FindLeadsLayout({ children }: { children: React.ReactNode }) {
  await requireWorkspace();
  return children;
}
