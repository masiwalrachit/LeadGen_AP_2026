"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ArrowRight, AtSign, Building2, Check, Copy, FlaskConical, KeyRound, Users } from "lucide-react";
import { USERNAME_INPUT_PATTERN, usernameSchema } from "@/lib/auth/username";
import { isDemoMode } from "@/lib/demo/mode";
import { makeDemoJoinCode, saveDemoWorkspace } from "@/lib/demo/session-client";
import { SERVICES, type ServiceCode } from "@/features/campaigns/services";
import { Brand } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import styles from "./onboarding.module.css";

type Mode = "create" | "join";
type Errors = Partial<Record<"username" | "name" | "location" | "website" | "services" | "code" | "form", string>>;

function validate(mode: Mode, form: FormData): Errors {
  const errors: Errors = {};
  const username = usernameSchema.safeParse(form.get("username"));
  if (!username.success) errors.username = username.error.issues[0]?.message ?? "Choose a username.";
  if (mode === "create") {
    if (String(form.get("name") ?? "").trim().length < 2) errors.name = "Name your workspace (at least 2 characters).";
    if (String(form.get("location") ?? "").trim().length < 2) errors.location = "Add the city or region you usually target.";
    const website = String(form.get("website") ?? "").trim();
    if (website && !/^https?:\/\/[^\s.]+\.[^\s]+$/i.test(website)) errors.website = "Use a full address like https://yourstudio.com, or leave it empty.";
    if (form.getAll("services").length === 0) errors.services = "Pick at least one service you sell.";
  } else if (String(form.get("code") ?? "").trim().length < 5) {
    errors.code = "Paste the join code your teammate shared (like LG-AB12CD34).";
  }
  return errors;
}

export default function OnboardingPage() {
  const router = useRouter();
  const demo = isDemoMode();
  const [mode, setMode] = useState<Mode>("create");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
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
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const found = validate(mode, form);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      formElement.querySelector<HTMLElement>(`[name="${Object.keys(found)[0]}"]`)?.focus();
      return;
    }
    setBusy(true);
    const username = String(form.get("username")).trim().toLowerCase();

    if (demo) {
      const name = mode === "create" ? String(form.get("name")).trim() : "Shared workspace";
      const joinCode = mode === "create" ? makeDemoJoinCode() : String(form.get("code")).trim().toUpperCase();
      saveDemoWorkspace({ name, location: String(form.get("location") ?? "").trim(), username, joinCode });
      setBusy(false);
      if (mode === "create") setCreated({ name, joinCode });
      else goToDashboard();
      return;
    }

    const body =
      mode === "create"
        ? { action: "create", username, name: form.get("name"), website: form.get("website"), location: form.get("location"), services: form.getAll("services") }
        : { action: "join", username, code: form.get("code") };
    try {
      const response = await fetch("/api/workspaces", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const payload = (await response.json().catch(() => ({}))) as { error?: string; workspace?: { workspaceName?: string; joinCode?: string } };
      if (!response.ok) throw new Error(payload.error ?? "Workspace setup failed. Please try again.");
      if (mode === "create" && payload.workspace?.joinCode) {
        setCreated({ name: payload.workspace.workspaceName ?? "Your workspace", joinCode: payload.workspace.joinCode });
        return;
      }
      goToDashboard();
    } catch (caught) {
      setErrors({ form: caught instanceof Error ? caught.message : "Workspace setup failed. Please try again." });
    } finally {
      setBusy(false);
    }
  }

  const fieldError = (key: keyof Errors) =>
    errors[key] ? <p className={styles.fieldError} id={`${key}-error`}>{errors[key]}</p> : null;

  return (
    <div className={styles.page}>
      <header className={styles.top}>
        <Brand href="/onboarding" />
        <ThemeToggle />
      </header>
      <main className={styles.main} id="main">
        {created ? (
          <section className={`${styles.card} enter`} aria-labelledby="ready-title">
            <h1 id="ready-title">{created.name} is ready</h1>
            <p className={styles.lede}>Share this code with teammates. Anyone with it can join.</p>
            <div className={styles.code}>
              <KeyRound size={18} aria-hidden="true" />
              <strong aria-label="Workspace join code">{created.joinCode}</strong>
              <Button size="sm" variant="secondary" onClick={copyCode} icon={copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}>
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
            {demo ? <p className={styles.hint}>Demo mode: this code only works in this browser.</p> : null}
            <Button variant="primary" size="lg" onClick={goToDashboard}>
              Go to dashboard <ArrowRight size={17} aria-hidden="true" />
            </Button>
          </section>
        ) : (
          <section className={`${styles.card} enter`} aria-labelledby="setup-title">
            <h1 id="setup-title">Set up your workspace</h1>

            {demo ? (
              <p className={styles.demoNote} role="note">
                <FlaskConical size={16} aria-hidden="true" />
                Demo mode: saved in this browser only.
              </p>
            ) : null}

            <div className={styles.switcher} role="group" aria-label="Workspace setup">
              <button type="button" aria-pressed={mode === "create"} onClick={() => { setMode("create"); setErrors({}); }}>
                <Building2 size={16} aria-hidden="true" /> Create
              </button>
              <button type="button" aria-pressed={mode === "join"} onClick={() => { setMode("join"); setErrors({}); }}>
                <Users size={16} aria-hidden="true" /> Join with code
              </button>
            </div>

            <form className={styles.form} onSubmit={submit} noValidate>
              <div className={styles.field}>
                <label htmlFor="username">Your username</label>
                <div className={styles.prefixed}>
                  <AtSign size={16} aria-hidden="true" />
                  <input id="username" name="username" autoComplete="username" placeholder="priya_sharma" maxLength={30} pattern={USERNAME_INPUT_PATTERN} aria-invalid={Boolean(errors.username)} aria-describedby={errors.username ? "username-error" : "username-hint"} />
                </div>
                {errors.username ? fieldError("username") : <p className={styles.hint} id="username-hint">3–30 letters, numbers, _ or -</p>}
              </div>

              {mode === "create" ? (
                <>
                  <div className={styles.row}>
                    <div className={styles.field}>
                      <label htmlFor="name">Workspace name</label>
                      <input id="name" name="name" autoComplete="organization" placeholder="Northwind Studio" aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? "name-error" : undefined} />
                      {fieldError("name")}
                    </div>
                    <div className={styles.field}>
                      <label htmlFor="location">Location</label>
                      <input id="location" name="location" autoComplete="address-level2" placeholder="Delhi" aria-invalid={Boolean(errors.location)} aria-describedby={errors.location ? "location-error" : undefined} />
                      {fieldError("location")}
                    </div>
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="website">Website <span className={styles.optional}>(optional)</span></label>
                    <input id="website" name="website" type="url" autoComplete="url" placeholder="https://yourstudio.com" aria-invalid={Boolean(errors.website)} aria-describedby={errors.website ? "website-error" : undefined} />
                    {fieldError("website")}
                  </div>
                  <fieldset className={styles.services} aria-describedby={errors.services ? "services-error" : undefined}>
                    <legend>Services you sell</legend>
                    <div className={styles.serviceGrid}>
                      {(Object.entries(SERVICES) as Array<[ServiceCode, string]>).map(([value, label]) => (
                        <label className={styles.service} key={value}>
                          <input type="checkbox" name="services" value={value} defaultChecked={value === "redesign"} />
                          <span>{label}</span>
                        </label>
                      ))}
                    </div>
                    {fieldError("services")}
                  </fieldset>
                </>
              ) : (
                <div className={styles.field}>
                  <label htmlFor="code">Workspace join code</label>
                  <input id="code" name="code" placeholder="LG-AB12CD34" autoCapitalize="characters" aria-invalid={Boolean(errors.code)} aria-describedby={errors.code ? "code-error" : undefined} />
                  {fieldError("code")}
                </div>
              )}

              {errors.form ? <p className={styles.formError} role="alert">{errors.form}</p> : null}

              <Button type="submit" variant="primary" size="lg" block loading={busy}>
                {mode === "create" ? "Create workspace" : "Join workspace"}
              </Button>
            </form>
          </section>
        )}
      </main>
    </div>
  );
}
