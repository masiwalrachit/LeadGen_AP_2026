"use client";

import Link from "next/link";
import { useRef, useState, type DragEvent, type FormEvent } from "react";
import { ArrowRight, Check, ExternalLink, FileSpreadsheet, FlaskConical, Info, RotateCcw, ShieldQuestion, X } from "lucide-react";
import type { ValidatedCandidate } from "@/lib/qualification/types";
import { formatDateTime, sourceHost } from "@/lib/format";
import { SERVICES, SERVICE_CODES, type ServiceCode } from "@/features/campaigns/services";
import { MAX_FILE_BYTES, RunError, runDemoValidation, type CampaignInput, type RunResult } from "@/features/campaigns/demo-run";
import { signalKind, signalLabel } from "@/features/leads/signals";
import { Button, LinkButton } from "@/components/ui/button";
import { Monogram } from "@/components/ui/monogram";
import { CandidateStamp } from "@/components/ui/status";
import styles from "./campaign.module.css";

type ApiResponse = {
  error?: string;
  candidates?: ValidatedCandidate[];
  stats?: Partial<RunResult["stats"]>;
  issues?: Array<{ row: number; message: string }>;
};

const STAGES = ["Clean the file", "Match industry and location", "Check websites", "Store evidence"];

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const calm = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function KindIcon({ kind }: { kind: ReturnType<typeof signalKind> }) {
  if (kind === "need") return <X size={14} strokeWidth={2.5} aria-hidden="true" />;
  if (kind === "healthy") return <Check size={14} strokeWidth={2.5} aria-hidden="true" />;
  if (kind === "blocked") return <ShieldQuestion size={14} aria-hidden="true" />;
  return <Info size={14} aria-hidden="true" />;
}

export function NewCampaignForm({ demo }: { demo: boolean }) {
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [stage, setStage] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [issues, setIssues] = useState<Array<{ row: number; message: string }>>([]);
  const [result, setResult] = useState<RunResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const running = stage !== null;

  function pickFile(next: File | null) {
    setFile(next);
    setError("");
    setIssues([]);
  }

  async function useSample() {
    try {
      const response = await fetch("/sample-candidates.csv");
      if (!response.ok) throw new Error("not found");
      pickFile(new File([await response.blob()], "sample-candidates.csv", { type: "text/csv" }));
    } catch {
      setError("The sample file could not be loaded. Download it from the link and choose it instead.");
    }
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    pickFile(event.dataTransfer.files?.[0] ?? null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const campaign: CampaignInput = {
      name: String(form.get("name") ?? "").trim(),
      service: String(form.get("service")) as ServiceCode,
      industry: String(form.get("industry") ?? "").trim(),
      location: String(form.get("location") ?? "").trim(),
    };

    setError("");
    setIssues([]);
    setResult(null);

    if (!file) return setError("Choose a CSV file first, or use the sample file.");
    if (!file.name.toLowerCase().endsWith(".csv")) return setError("Upload a CSV file.");
    if (file.size > MAX_FILE_BYTES) return setError("CSV files must be 1 MB or smaller.");
    if (campaign.name.length < 3 || campaign.industry.length < 2 || campaign.location.length < 2) {
      return setError("Complete every analysis field before running validation.");
    }

    const pause = (ms: number) => wait(calm() ? 0 : ms);
    setStage(0);
    try {
      if (demo) {
        // Parse first so a bad file fails immediately; the stages then play out for the demo.
        const outcome = runDemoValidation(await file.text(), campaign);
        for (let next = 0; next < STAGES.length; next += 1) {
          setStage(next);
          await pause(next === 2 ? 900 : 450);
        }
        setResult(outcome);
        return;
      }

      setStage(2);
      const body = new FormData();
      body.set("name", campaign.name);
      body.set("service", campaign.service);
      body.set("industry", campaign.industry);
      body.set("location", campaign.location);
      body.set("file", file);
      const response = await fetch("/api/qualify", { method: "POST", body });
      // A proxy or crash page can return HTML instead of JSON; do not surface that as a parse error.
      const payload = (await response.json().catch(() => ({}))) as ApiResponse;
      if (!response.ok) {
        setIssues(payload.issues ?? []);
        throw new Error(payload.error ?? `Website validation failed (HTTP ${response.status}).`);
      }
      const candidates = payload.candidates ?? [];
      setResult({
        campaign,
        candidates,
        issues: payload.issues ?? [],
        simulated: false,
        stats: {
          rowsAccepted: payload.stats?.rowsAccepted ?? candidates.length,
          duplicatesRemoved: payload.stats?.duplicatesRemoved ?? 0,
          invalidRows: payload.stats?.invalidRows ?? 0,
          deterministicFiltered: payload.stats?.deterministicFiltered ?? 0,
          validated: payload.stats?.validated ?? candidates.length,
          evidenceCollected: payload.stats?.evidenceCollected ?? candidates.reduce((total, item) => total + item.evidence.length, 0),
        },
      });
    } catch (caught) {
      if (caught instanceof RunError) setIssues(caught.issues);
      setError(caught instanceof Error ? caught.message : "Website validation failed unexpectedly.");
    } finally {
      setStage(null);
    }
  }

  function reset() {
    setResult(null);
    setFile(null);
    setError("");
    setIssues([]);
  }

  if (result) {
    const { stats } = result;
    const skipped = [
      stats.duplicatesRemoved ? `${stats.duplicatesRemoved} duplicate${stats.duplicatesRemoved === 1 ? "" : "s"} removed` : "",
      stats.invalidRows ? `${stats.invalidRows} invalid row${stats.invalidRows === 1 ? "" : "s"}` : "",
      stats.deterministicFiltered ? `${stats.deterministicFiltered} outside the campaign` : "",
    ].filter(Boolean);

    return (
      <div className={styles.results}>
        <section className={`${styles.card} enter`} aria-labelledby="done-title">
          <div className={styles.doneHead}>
            <span className={styles.doneMark} aria-hidden="true"><Check size={20} strokeWidth={3} /></span>
            <div>
              <h2 id="done-title">{stats.validated} candidate{stats.validated === 1 ? "" : "s"} validated</h2>
              <p>{stats.evidenceCollected} pieces of evidence for “{result.campaign.name}”{skipped.length ? ` · ${skipped.join(" · ")}` : ""}</p>
            </div>
          </div>
          {result.simulated ? (
            <p className={styles.note}>
              <FlaskConical size={16} aria-hidden="true" />
              Demo mode: your file was really read and filtered, but the website checks are simulated from sample evidence. Nothing was fetched or stored.
            </p>
          ) : null}
          {result.issues.length > 0 ? (
            <details className={styles.issues}>
              <summary>{result.issues.length} row{result.issues.length === 1 ? "" : "s"} skipped</summary>
              <ul>
                {result.issues.map((issue) => (
                  <li key={`${issue.row}-${issue.message}`}>Row {issue.row}: {issue.message}</li>
                ))}
              </ul>
            </details>
          ) : null}
          <p className={styles.hint}>These records stay candidates. A candidate becomes a lead only after it is scored from its evidence.</p>
          <div className={styles.actions}>
            <LinkButton href="/leads" variant="primary" icon={<ArrowRight size={17} aria-hidden="true" />}>View leads</LinkButton>
            <Button variant="secondary" icon={<RotateCcw size={16} aria-hidden="true" />} onClick={reset}>Run another file</Button>
          </div>
        </section>

        <ul className={styles.candidates}>
          {result.candidates.map((candidate, index) => (
            <li key={candidate.id} className={`enter enter-delay-${Math.min(index + 1, 3)}`}>
              <details className={styles.candidate} open={index === 0}>
                <summary>
                  <Monogram name={candidate.businessName} size={36} />
                  <span className={styles.candidateName}>{candidate.businessName}</span>
                  <CandidateStamp />
                  <span className={styles.count}>{candidate.evidence.length} sources</span>
                </summary>
                <ul className={styles.evidence}>
                  {candidate.evidence.map((item) => (
                    <li key={item.id}>
                      <span className={styles.kind}><KindIcon kind={signalKind(item)} /></span>
                      <div>
                        <p>{signalLabel(item)}</p>
                        <a href={item.sourceUrl} target="_blank" rel="noreferrer">
                          {sourceHost(item.sourceUrl)} · {formatDateTime(item.observedAt)}
                          <ExternalLink size={13} aria-hidden="true" />
                          <span className="visually-hidden">(opens in a new tab)</span>
                        </a>
                      </div>
                    </li>
                  ))}
                </ul>
              </details>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <form className={`${styles.card} enter`} onSubmit={submit} noValidate>
      <ol className={styles.stepper} aria-label="What happens when you run it">
        {STAGES.map((label, index) => (
          <li key={label} data-state={stage === null ? "idle" : index < stage ? "done" : index === stage ? "active" : "next"} aria-current={stage === index ? "step" : undefined}>
            <span aria-hidden="true">{stage !== null && index < stage ? <Check size={13} strokeWidth={3} /> : index + 1}</span>
            {label}
          </li>
        ))}
      </ol>

      <div className={styles.fields}>
        <div className={`${styles.field} ${styles.wide}`}>
          <label htmlFor="name">Analysis name</label>
          <input id="name" name="name" defaultValue="Delhi dental opportunities" disabled={running} />
        </div>
        <div className={styles.field}>
          <label htmlFor="service">Service you are selling</label>
          <select id="service" name="service" defaultValue="redesign" disabled={running}>
            {SERVICE_CODES.map((code) => (
              <option key={code} value={code}>{SERVICES[code]}</option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label htmlFor="industry">Industry</label>
          <input id="industry" name="industry" defaultValue="Dentist" disabled={running} />
        </div>
        <div className={`${styles.field} ${styles.wide}`}>
          <label htmlFor="location">Location</label>
          <input id="location" name="location" defaultValue="Delhi" disabled={running} />
        </div>
      </div>

      <div className={styles.field}>
        <span className={styles.label}>Candidate file (CSV)</span>
        <label
          className={styles.drop}
          data-dragging={dragging}
          data-filled={Boolean(file)}
          onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          <FileSpreadsheet size={26} aria-hidden="true" />
          <strong>{file ? file.name : "Drop a CSV here or click to choose"}</strong>
          <span>{file ? `${Math.max(1, Math.round(file.size / 1024))} KB` : "Up to 15 matching rows, 1 MB"}</span>
          <input ref={inputRef} className="visually-hidden" type="file" accept=".csv,text/csv" disabled={running} onChange={(event) => pickFile(event.target.files?.[0] ?? null)} />
        </label>
        <p className={styles.links}>
          <button type="button" className={styles.linkButton} onClick={useSample} disabled={running}>Use the sample file</button>
          <span aria-hidden="true">·</span>
          <a href="/sample-candidates.csv" download>Download it</a>
        </p>
      </div>

      {error ? (
        <div className={styles.error} role="alert">
          <p>{error}</p>
          {issues.length > 0 ? (
            <ul>
              {issues.map((issue) => (
                <li key={`${issue.row}-${issue.message}`}>Row {issue.row}: {issue.message}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <div className={styles.actions}>
        <Button type="submit" variant="primary" size="lg" loading={running}>
          {running ? "Validating…" : "Run website validation"}
        </Button>
        <Link className={styles.cancel} href="/dashboard">Cancel</Link>
      </div>
    </form>
  );
}
