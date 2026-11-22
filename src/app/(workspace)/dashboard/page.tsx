import type { Metadata } from "next";
import { formatDateTime } from "@/lib/format";
import { DEMO_CAMPAIGNS, DEMO_RECORDS, getCampaign, recordsForCampaign } from "@/features/demo/data";
import { buildBrief } from "@/features/leads/brief";
import { CampaignStatusChip } from "@/components/ui/status";
import { DashboardTop, type DashboardLead } from "./dashboard-top";
import styles from "./dashboard.module.css";

export const metadata: Metadata = { title: "Overview" };

function CampaignList() {
  return (
    <section className={styles.section} aria-labelledby="campaigns-title">
      <h2 id="campaigns-title">Campaigns</h2>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Campaign</th>
              <th scope="col">Status</th>
              <th scope="col">Sourced leads</th>
              <th scope="col">Started</th>
            </tr>
          </thead>
          <tbody>
            {DEMO_CAMPAIGNS.map((campaign) => {
              const records = recordsForCampaign(campaign.id);
              const leads = records.filter((record) => record.qualified).length;
              const running = campaign.status === "validating" || campaign.status === "scoring";
              const percent = Math.round((records.length / Math.max(campaign.validated, 1)) * 100);
              return (
                <tr key={campaign.id}>
                  <td data-label="Campaign">
                    <span className={styles.campaignName}>{campaign.name}</span>
                    {campaign.problem ? <span className={styles.problem}>{campaign.problem}</span> : null}
                  </td>
                  <td data-label="Status">
                    <span className={styles.statusCell}>
                      <CampaignStatusChip status={campaign.status} />
                      {running ? (
                        <span className={styles.progressRow}>
                          <span className={styles.progressTrack} role="progressbar" aria-label={`${campaign.name}: ${records.length} of ${campaign.validated} scored`} aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
                            <span style={{ width: `${Math.max(percent, 6)}%` }} />
                          </span>
                          <span className={`${styles.progress} tabular`}>{records.length}/{campaign.validated}</span>
                        </span>
                      ) : null}
                    </span>
                  </td>
                  <td data-label="Sourced leads" className={`${styles.num} tabular`}>{campaign.status === "failed" ? "–" : leads}</td>
                  <td data-label="Started" className={styles.muted}>{formatDateTime(campaign.createdAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function DashboardPage() {
  const leads: DashboardLead[] = DEMO_RECORDS.filter((record) => record.qualified).map((record) => ({
    id: record.id,
    name: record.businessName,
    campaign: getCampaign(record.campaignId)?.name ?? "",
    score: record.finalScore,
    seeded: record.reviewStatus,
    reasons: buildBrief(record)
      .sources.filter((source) => source.kind === "need")
      .map((source) => source.label),
  }));
  const running = DEMO_CAMPAIGNS.filter((campaign) => campaign.status === "validating" || campaign.status === "scoring").length;

  return (
    <>
      <DashboardTop leads={leads} recordsChecked={DEMO_RECORDS.length} campaignsRunning={running} campaignsTotal={DEMO_CAMPAIGNS.length} />
      <CampaignList />
    </>
  );
}
