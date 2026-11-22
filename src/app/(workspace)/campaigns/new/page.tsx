import type { Metadata } from "next";
import { isDemoMode } from "@/lib/demo/mode";
import { PageHeader } from "@/components/ui/misc";
import { DemoStrip } from "@/components/ui/status";
import { NewCampaignForm } from "./new-campaign-form";

export const metadata: Metadata = { title: "New campaign" };

export default function NewCampaignPage() {
  const demo = isDemoMode();
  return (
    <>
      <PageHeader title="New campaign" badge={demo ? <DemoStrip>Website checks are simulated</DemoStrip> : null} />
      <NewCampaignForm demo={demo} />
    </>
  );
}
