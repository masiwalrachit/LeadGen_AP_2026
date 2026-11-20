"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, ExternalLink, Inbox, Link2, Waypoints } from "lucide-react";
import type { QualifiedCandidate, ScoreDimension } from "@/lib/qualification/types";
import styles from "../workspace.module.css";

const STORAGE_KEY = "leadgen.csvQualification.v1";
const dimensions: Array<[ScoreDimension, string]> = [
  ["fit", "Fit"],
  ["need", "Need"],
  ["timing", "Timing"],
  ["reachability", "Reachability"],
  ["evidenceQuality", "Evidence"],
];

type StoredResult = {
  campaign: { name: string; serviceName: string; industry: string; location: string };
  leads: QualifiedCandidate[];
  stats: { rowsAccepted: number; duplicatesRemoved: number; assessed: number; qualified: number; evidenceCollected?: number };
  model: { name: string; scoringVersion: string; threshold: number };
};

export default function LeadsPage() {
  const [result, setResult] = useState<StoredResult | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try { setResult(JSON.parse(saved) as StoredResult); } catch { localStorage.removeItem(STORAGE_KEY); }
      }
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  function updateStatus(candidateId: string, reviewStatus: QualifiedCandidate["reviewStatus"]) {
    setResult((current) => {
      if (!current) return current;
      const next = { ...current, leads: current.leads.map((lead) => lead.id === candidateId ? { ...lead, reviewStatus } : lead) };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }

  return (
    <div className={styles.page}>
      <header className={styles.topbar}>
        <Link className={styles.brand} href="/dashboard"><span className={styles.brandMark}><Waypoints size={19} /></span>LeadGen</Link>
        <nav className={styles.topnav} aria-label="Workspace navigation"><Link href="/dashboard">Overview</Link><Link href="/campaigns/new">Campaign</Link><Link href="/leads" aria-current="page">Leads</Link></nav>
      </header>
      <main className={styles.main}>
        <Link className={styles.backLink} href="/campaigns/new"><ArrowLeft size={16} />Back to campaign</Link>
        <header className={styles.pageHeader}>
          <div><h1>{result?.campaign.name ?? "Qualified lead inbox"}</h1><p>{result ? `${result.campaign.serviceName} · ${result.campaign.industry} · ${result.campaign.location}` : "Run a campaign to create an evidence-backed lead list."}</p></div>
          {result ? <div className={styles.trustNote}><Waypoints size={18} /><span>Assessed by {result.model.name}; final score calculated by application model {result.model.scoringVersion}.</span></div> : null}
        </header>

        {!ready ? null : !result ? (
          <section className={styles.emptyState}><Inbox size={34} /><h2>No qualification run yet</h2><p>Upload candidate records and run the real scoring pipeline. Only candidates that meet the evidence threshold appear here.</p><Link className={styles.primaryButton} href="/campaigns/new">Create campaign</Link></section>
        ) : (
          <>
            <div className={styles.stats} aria-label="Qualification summary">
              <div className={styles.stat}><strong>{result.stats.rowsAccepted}</strong><span>Valid CSV records</span></div>
              <div className={styles.stat}><strong>{result.stats.duplicatesRemoved}</strong><span>Duplicates removed</span></div>
              <div className={styles.stat}><strong>{result.stats.assessed}</strong><span>AI assessed</span></div>
              <div className={styles.stat}><strong>{result.stats.evidenceCollected ?? "—"}</strong><span>Evidence observations</span></div>
            </div>
            <section className={styles.leadList}>
              <header className={styles.leadListHeader}><div><h2>Evidence-backed leads</h2><p>Review the source and score breakdown before contacting anyone.</p></div><span className={styles.threshold}>Threshold {result.model.threshold}/100</span></header>
              {result.leads.length === 0 ? <div className={styles.emptyState}><Inbox size={30} /><h2>No candidate qualified</h2><p>The pipeline worked, but the supplied evidence did not support a score above the threshold. Improve the source evidence rather than lowering the standard blindly.</p></div> : result.leads.map((lead) => (
                <article className={styles.leadRow} key={lead.id}>
                  <div className={styles.leadHead}><div><h3>{lead.businessName}</h3><p className={styles.meta}>{lead.industry} · {lead.location} · observed {new Date(lead.observedAt).toLocaleDateString()}</p></div><div className={styles.score}><strong>{lead.finalScore}</strong><span>LEAD SCORE</span></div></div>
                  <p className={styles.summary}>{lead.summary}</p>
                  <a className={styles.evidenceLink} href={lead.sourceUrl} target="_blank" rel="noreferrer">Inspect supplied evidence <ExternalLink size={13} /></a>
                  {lead.contactPath ? <p className={styles.contactPath}><Link2 size={14} /><span>Qualified contact path:</span> <a href={lead.contactPath.includes("@") && !lead.contactPath.startsWith("http") ? `mailto:${lead.contactPath}` : lead.contactPath}>{lead.contactPath}</a></p> : null}
                  <div className={styles.breakdown} aria-label={`Score breakdown for ${lead.businessName}`}>
                    {dimensions.map(([key, label]) => <div className={styles.dimension} key={key} title={lead.explanations[key]}><span>{label}</span><strong>{lead.scores[key]}</strong></div>)}
                  </div>
                  <details className={styles.evidenceDisclosure}>
                    <summary>{lead.evidence.length} stored evidence observation{lead.evidence.length === 1 ? "" : "s"}</summary>
                    <div className={styles.evidenceRecords}>
                      {lead.evidence.map((item) => <article key={item.id} data-cited={lead.supportingEvidenceIds.includes(item.id)}>
                        <div><strong>{item.observation}</strong>{lead.supportingEvidenceIds.includes(item.id) ? <span>Used by assessment</span> : null}</div>
                        <p>{item.validator} · {new Date(item.observedAt).toLocaleString()}</p>
                        <a href={item.sourceUrl} target="_blank" rel="noreferrer">Open source <ExternalLink size={12} /></a>
                      </article>)}
                    </div>
                  </details>
                  <div className={styles.leadActions} aria-label={`Review ${lead.businessName}`}>
                    {(["new", "saved", "contacted"] as const).map((status) => <button className={styles.statusButton} data-active={lead.reviewStatus === status} key={status} type="button" onClick={() => updateStatus(lead.id, status)}>{status === "new" ? "New" : status === "saved" ? "Save" : "Mark contacted"}</button>)}
                    <button className={styles.statusButton} data-active={lead.reviewStatus === "rejected"} data-tone="danger" type="button" onClick={() => updateStatus(lead.id, "rejected")}>Reject</button>
                  </div>
                </article>
              ))}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
