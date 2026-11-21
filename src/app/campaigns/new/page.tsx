"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { ArrowLeft, CheckCircle2, ExternalLink, FileCheck2, FileSpreadsheet, LoaderCircle, ShieldCheck, Waypoints } from "lucide-react";
import type { ValidatedCandidate } from "@/lib/qualification/types";
import { RESULTS_STORAGE_KEY } from "@/lib/qualification/stored-result";
import { SignOutButton } from "@/components/sign-out-button";
import styles from "../../workspace.module.css";

type QualificationResponse = {
  campaign: { name: string; serviceName: string; industry: string; location: string; status: "completed" };
  candidates: ValidatedCandidate[];
  leads: [];
  model: null;
  stats: { rowsAccepted: number; duplicatesRemoved: number; invalidRows: number; deterministicFiltered: number; validated: number; qualified: 0; evidenceCollected: number };
  issues: Array<{ row: number; message: string }>;
};


function AppHeader() {
  return (
    <header className={styles.topbar}>
      <Link className={styles.brand} href="/dashboard"><span className={styles.brandMark}><Waypoints size={19} /></span>LeadGen</Link>
      <nav className={styles.topnav} aria-label="Workspace navigation">
        <Link href="/dashboard">Overview</Link>
        <Link href="/campaigns/new" aria-current="page">Campaign</Link>
        <Link href="/leads">Leads</Link>
        <Link href="/team">Team</Link>
        <SignOutButton />
      </nav>
    </header>
  );
}

export default function NewCampaignPage() {
  const [fileName, setFileName] = useState("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<QualificationResponse | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRunning(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch("/api/qualify", { method: "POST", body: new FormData(event.currentTarget) });
      // A proxy or crash page can return HTML instead of JSON; do not let that surface as a parse error.
      const payload = (await response.json().catch(() => ({}))) as QualificationResponse & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? `Website validation failed (HTTP ${response.status}).`);
      localStorage.setItem(RESULTS_STORAGE_KEY, JSON.stringify(payload));
      setResult(payload);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Website validation failed unexpectedly.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className={styles.page}>
      <AppHeader />
      <main className={styles.main}>
        <Link className={styles.backLink} href="/dashboard"><ArrowLeft size={16} />Back to overview</Link>
        <header className={styles.pageHeader}>
          <div>
            <h1>Turn a candidate file into inspectable evidence.</h1>
            <p>Define one targeting hypothesis, upload source-backed candidate records, and run deterministic website checks before any future lead analysis.</p>
          </div>
          <div className={styles.trustNote}><ShieldCheck size={18} /><span>Lead analysis is paused. This flow validates candidate websites and stores evidence without creating leads or scores.</span></div>
        </header>

        <div className={styles.campaignGrid}>
          <section className={styles.surface}>
            <h2>Create campaign</h2>
            <p>One service, one industry, and one location keeps the recommendation explainable.</p>
            <form className={styles.form} onSubmit={handleSubmit}>
              <div className={styles.fieldGrid}>
                <div className={`${styles.field} ${styles.fieldFull}`}><label htmlFor="name">Campaign name</label><input id="name" name="name" defaultValue="Delhi dental website opportunities" required /></div>
                <div className={styles.field}><label htmlFor="service">Service playbook</label><select id="service" name="service" defaultValue="redesign"><option value="new-website">New website development</option><option value="redesign">Website redesign</option><option value="ecommerce">E-commerce development</option><option value="maintenance">Maintenance and performance</option></select></div>
                <div className={styles.field}><label htmlFor="industry">Target industry</label><input id="industry" name="industry" defaultValue="Dentist" required /></div>
                <div className={`${styles.field} ${styles.fieldFull}`}><label htmlFor="location">Target location</label><input id="location" name="location" defaultValue="Delhi" required /></div>
                <div className={`${styles.field} ${styles.fieldFull}`}>
                  <span className={styles.fileLabel}>Candidate CSV</span>
                  <label className={styles.fileDrop} htmlFor="file">
                    <FileSpreadsheet size={26} color="currentColor" />
                    <strong>{fileName || "Choose a source-backed CSV file"}</strong>
                    <span>Required: business, industry, location, description, source URL, observed time · max 15 matching rows</span>
                    <input id="file" name="file" type="file" accept=".csv,text/csv" required onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")} />
                  </label>
                </div>
              </div>
              {error ? <div className={styles.error} role="alert"><ShieldCheck size={18} />{error}</div> : null}
              {result ? <div className={styles.success} role="status"><CheckCircle2 size={18} />Completed: {result.stats.validated} candidates validated and {result.stats.evidenceCollected} evidence observations stored.</div> : null}
              <div className={styles.formFooter}>
                <a className={styles.sampleLink} href="/sample-candidates.csv" download>Download clearly labelled sample CSV</a>
                <button className={styles.primaryButton} type="submit" disabled={running}>{running ? <LoaderCircle className={styles.spinner} size={18} /> : <FileCheck2 size={18} />}{running ? "Validating websites…" : "Run website validation"}</button>
              </div>
            </form>
          </section>

          <aside className={styles.sideSurface}>
            <h2>What runs</h2>
            <p>No row becomes a lead merely because it exists in the file.</p>
            <ol className={styles.processList}>
              <li><span className={styles.processIcon}><FileCheck2 size={15} /></span><div><strong>Validate and deduplicate</strong><span>Malformed evidence and repeated domains are removed before website requests.</span></div></li>
              <li><span className={styles.processIcon}><ShieldCheck size={15} /></span><div><strong>Apply deterministic filters</strong><span>Industry and location must match the campaign.</span></div></li>
              <li><span className={styles.processIcon}><ShieldCheck size={15} /></span><div><strong>Validate public websites</strong><span>HTTP, mobile viewport, contact paths, freshness, and important pages become inspectable evidence.</span></div></li>
              <li><span className={styles.processIcon}><Waypoints size={15} /></span><div><strong>Store evidence</strong><span>Every observation retains its source URL, timestamp, extracted value, and validator.</span></div></li>
            </ol>
          </aside>
        </div>

        {result ? <section className={styles.leadList} style={{ marginTop: 22 }}>
          <header className={styles.leadListHeader}><div><h2>Candidate evidence report</h2><p>These records remain candidates. No lead analysis or qualification has run.</p></div><span className={styles.threshold}>{result.stats.evidenceCollected} observations</span></header>
          {result.candidates.map((candidate) => <article className={styles.leadRow} key={candidate.id}>
            <div className={styles.leadHead}><div><h3>{candidate.businessName}</h3><p className={styles.meta}>{candidate.industry} · {candidate.location}</p></div><span className={styles.threshold}>Candidate</span></div>
            <div className={styles.evidenceRecords}>
              {candidate.evidence.map((item) => <article key={item.id}><div><strong>{item.observation}</strong><span>{item.validator}</span></div><p>{new Date(item.observedAt).toLocaleString()}</p><a href={item.sourceUrl} target="_blank" rel="noreferrer">Open source <ExternalLink size={12} /></a></article>)}
            </div>
          </article>)}
        </section> : null}
      </main>
    </div>
  );
}
