import { requireWorkspace } from "@/lib/auth/workspace";

export default async function AnalyzeLeadsLayout({ children }: { children: React.ReactNode }) {
  await requireWorkspace();
  return children;
}
