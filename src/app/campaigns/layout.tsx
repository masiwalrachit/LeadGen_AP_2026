import { requireWorkspace } from "@/lib/auth/workspace";

export default async function CampaignsLayout({ children }: { children: React.ReactNode }) {
  await requireWorkspace();
  return children;
}
