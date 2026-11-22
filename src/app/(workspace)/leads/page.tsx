import type { Metadata } from "next";
import { FilePlus2 } from "lucide-react";
import { DEMO_CAMPAIGNS, DEMO_RECORDS } from "@/features/demo/data";
import { buildBrief } from "@/features/leads/brief";
import { LinkButton } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/misc";
import { DemoStrip } from "@/components/ui/status";
import { LeadInbox, type InboxRow } from "./lead-inbox";

export const metadata: Metadata = { title: "Leads" };

export default function LeadsPage() {
  const rows: InboxRow[] = DEMO_RECORDS.map((record) => {
    const brief = buildBrief(record);
    return {
      id: record.id,
      businessName: record.businessName,
      campaignId: record.campaignId,
      score: record.finalScore,
      qualified: record.qualified,
      reviewStatus: record.reviewStatus,
      newest: record.observedAt,
      reason:
        brief.sources.find((source) => source.kind === "need")?.label ??
        (brief.sources.some((source) => source.kind === "blocked") ? "Some checks couldn't run" : "No website problems found"),
    };
  });

  return (
    <>
      <PageHeader
        title="Leads"
        badge={<DemoStrip />}
        actions={<LinkButton href="/campaigns/new" variant="primary" icon={<FilePlus2 size={18} aria-hidden="true" />}>New campaign</LinkButton>}
      />
      <LeadInbox rows={rows} campaigns={DEMO_CAMPAIGNS.map(({ id, name }) => ({ id, name }))} />
    </>
  );
}
