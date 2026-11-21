"use client";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AtSign, Building2, Check, Copy, LoaderCircle, Users } from "lucide-react";
import { USERNAME_INPUT_PATTERN } from "@/lib/auth/username";
import styles from "../workspace.module.css";

export default function OnboardingPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"create" | "join">("create");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<{ name: string; joinCode: string } | null>(null);
  const [copied, setCopied] = useState(false);

  function goToDashboard() {
    router.replace("/dashboard");
    router.refresh();
  }

  async function copyCode() {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.joinCode);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const username = form.get("username");
    const body = mode === "create"
      ? { action: "create", username, name: form.get("name"), website: form.get("website"), location: form.get("location"), services: form.getAll("services") }
      : { action: "join", username, code: form.get("code") };

    try {
      const response = await fetch("/api/workspaces", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const payload = await response.json().catch(() => ({})) as { error?: string; workspace?: { workspaceName?: string; joinCode?: string } };
      if (!response.ok) throw new Error(payload.error ?? "Workspace setup failed.");
      if (mode === "create" && payload.workspace?.joinCode) {
        // Show the join code once so the owner can invite teammates, then continue on their click.
        setCreated({ name: payload.workspace.workspaceName ?? "Your workspace", joinCode: payload.workspace.joinCode });
        return;
      }
      goToDashboard();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Workspace setup failed.");
    } finally {
      setBusy(false);
    }
  }

  if (created) {
    return (
      <div className={styles.page}>
        <main className={styles.main}>
          <section className={styles.surface} style={{ maxWidth: 760 }}>
            <h1>{created.name} is ready.</h1>
            <p>Share this join code with teammates so they can join your workspace. Keep it private: anyone who has it can join.</p>
            <p><strong aria-label="Workspace join code" style={{ fontSize: 28, letterSpacing: "0.04em" }}>{created.joinCode}</strong></p>
            <div className={styles.formFooter}>
              <button className={styles.statusButton} type="button" onClick={copyCode}>
                {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Copied" : "Copy code"}
              </button>
              <button className={styles.primaryButton} type="button" onClick={goToDashboard}>Continue to dashboard</button>
            </div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <header className={styles.pageHeader}>
          <div>
            <h1>Finish setting up your workspace.</h1>
            <p>Add the name people will see, then create a workspace or join your team.</p>
          </div>
        </header>

        <section className={styles.surface} style={{ maxWidth: 760 }}>
          <div className={styles.leadActions} role="tablist" aria-label="Workspace setup choice">
            <button className={styles.statusButton} data-active={mode === "create"} aria-selected={mode === "create"} role="tab" onClick={() => setMode("create")} type="button">
              <Building2 size={14} /> Create workspace
            </button>
            <button className={styles.statusButton} data-active={mode === "join"} aria-selected={mode === "join"} role="tab" onClick={() => setMode("join")} type="button">
              <Users size={14} /> Join with code
            </button>
          </div>

          <form className={styles.form} onSubmit={submit}>
            <div className={styles.fieldGrid}>
              <div className={`${styles.field} ${styles.fieldFull}`}>
                <label htmlFor="username">Username</label>
                <div className={styles.inputWithIcon}>
                  <AtSign size={17} aria-hidden="true" />
                  <input id="username" name="username" autoComplete="username" minLength={3} maxLength={30} pattern={USERNAME_INPUT_PATTERN} placeholder="rachit_masiwal" aria-describedby="username-help" required />
                </div>
                <span className={styles.fieldHint} id="username-help">Shown on your dashboard. Use 3–30 letters, numbers, underscores, or hyphens.</span>
              </div>

              {mode === "create" ? (
                <>
                  <div className={styles.field}><label htmlFor="name">Workspace name</label><input id="name" name="name" autoComplete="organization" required /></div>
                  <div className={styles.field}><label htmlFor="location">Default location</label><input id="location" name="location" autoComplete="address-level2" required /></div>
                  <div className={`${styles.field} ${styles.fieldFull}`}><label htmlFor="website">Workspace website (optional)</label><input id="website" name="website" type="url" autoComplete="url" placeholder="https://yourstudio.com" /></div>
                  <fieldset className={`${styles.field} ${styles.fieldFull}`}><legend className={styles.fileLabel}>Services offered</legend>{[["redesign", "Website redesign"], ["new-website", "New websites"], ["ecommerce", "E-commerce"], ["maintenance", "Maintenance"]].map(([value, label]) => <label key={value}><input name="services" type="checkbox" value={value} defaultChecked={value === "redesign"} /> {label}</label>)}</fieldset>
                </>
              ) : (
                <div className={`${styles.field} ${styles.fieldFull}`}><label htmlFor="code">Workspace join code</label><input id="code" name="code" placeholder="LG-AB12CD34" autoCapitalize="characters" required /></div>
              )}
            </div>

            {error ? <div className={styles.error} role="alert">{error}</div> : null}
            <div className={styles.formFooter}>
              <span className={styles.flowNote}>Next: your dashboard</span>
              <button className={styles.primaryButton} disabled={busy} type="submit">
                {busy ? <LoaderCircle className={styles.spinner} size={18} /> : null}
                {mode === "create" ? "Create workspace" : "Join workspace"}
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}
