"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, FlaskConical } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { startDemoSession } from "@/lib/demo/session-client";
import { Button } from "@/components/ui/button";
import styles from "./signup.module.css";

type Status = { kind: "idle" } | { kind: "loading"; via: "google" | "email" } | { kind: "error"; message: string } | { kind: "success"; message: string };

type FieldErrors = Partial<Record<"name" | "email" | "password", string>>;

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18">
      <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.23-.2-1.78H12v3.39h5.52a4.8 4.8 0 0 1-2.05 3.07l-.02.11 2.98 2.31.21.02c1.9-1.76 2.96-4.35 2.96-7.12Z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.97-.89 6.64-2.65l-3.17-2.44c-.85.59-1.97 1-3.47 1a6.03 6.03 0 0 1-5.7-4.17l-.1.01-3.1 2.4-.04.1A10.02 10.02 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.3 13.74a6.2 6.2 0 0 1-.32-1.95c0-.68.12-1.34.31-1.95l-.01-.13-3.14-2.44-.1.05A10 10 0 0 0 2 11.79c0 1.61.38 3.14 1.06 4.47l3.24-2.52Z" />
      <path fill="#EA4335" d="M12 5.68c1.88 0 3.15.81 3.88 1.48l2.83-2.77A9.62 9.62 0 0 0 12 1.58a10.02 10.02 0 0 0-8.94 5.74L6.3 9.84A6.05 6.05 0 0 1 12 5.68Z" />
    </svg>
  );
}

function validate(form: FormData): FieldErrors {
  const errors: FieldErrors = {};
  const name = String(form.get("name") ?? "").trim();
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (name.length < 2) errors.name = "Enter your name (at least 2 characters).";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Enter an email like you@agency.com.";
  if (password.length < 8) errors.password = "Use at least 8 characters.";
  return errors;
}

export function SignupForm({ demo, callbackFailed }: { demo: boolean; callbackFailed: boolean }) {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<Status>(
    callbackFailed ? { kind: "error", message: "Google sign-in could not be completed. Please try again." } : { kind: "idle" },
  );
  const loading = status.kind === "loading";

  function enterDemo(name: string, email: string) {
    startDemoSession({ name, email });
    router.push("/onboarding");
  }

  async function continueWithGoogle() {
    setStatus({ kind: "loading", via: "google" });
    if (demo) {
      enterDemo("Demo user", "");
      return;
    }
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback?next=/onboarding` },
      });
      if (error) throw error;
    } catch (error) {
      setStatus({ kind: "error", message: error instanceof Error ? error.message : "Google sign-in could not start. Please try again." });
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      const first = Object.keys(found)[0];
      formElement.querySelector<HTMLInputElement>(`[name="${first}"]`)?.focus();
      return;
    }
    const name = String(form.get("name")).trim();
    const email = String(form.get("email")).trim();
    setStatus({ kind: "loading", via: "email" });

    if (demo) {
      enterDemo(name, email);
      return;
    }

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password: String(form.get("password")),
        options: {
          data: { full_name: name },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
        },
      });
      if (error) throw error;
      if (data.session) {
        router.replace("/onboarding");
        router.refresh();
        return;
      }
      setStatus({ kind: "success", message: "Check your inbox to confirm your email, then you'll set up your workspace." });
      formElement.reset();
    } catch (error) {
      setStatus({ kind: "error", message: error instanceof Error ? error.message : "Your account could not be created. Please try again." });
    }
  }

  return (
    <div className={`${styles.formCard} enter`}>
      <header className={styles.formHead}>
        <h1>Create your account</h1>
      </header>

      {demo ? (
        <p className={styles.demoNote} role="note">
          <FlaskConical size={16} aria-hidden="true" />
          Demo mode: any name and email works.
        </p>
      ) : null}

      <Button variant="secondary" size="lg" block onClick={continueWithGoogle} loading={status.kind === "loading" && status.via === "google"} disabled={loading} icon={<GoogleMark />}>
        Continue with Google
      </Button>

      <div className={styles.divider}><span>or</span></div>

      <form className={styles.form} onSubmit={submit} noValidate>
        <div className={styles.field}>
          <label htmlFor="name">Full name</label>
          <input id="name" name="name" autoComplete="name" placeholder="Priya Sharma" aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? "name-error" : undefined} />
          {errors.name ? <p className={styles.fieldError} id="name-error">{errors.name}</p> : null}
        </div>
        <div className={styles.field}>
          <label htmlFor="email">Work email</label>
          <input id="email" name="email" type="email" autoComplete="email" inputMode="email" placeholder="you@agency.com" aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "email-error" : undefined} />
          {errors.email ? <p className={styles.fieldError} id="email-error">{errors.email}</p> : null}
        </div>
        <div className={styles.field}>
          <label htmlFor="password">Password</label>
          <div className={styles.passwordWrap}>
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Choose a password"
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? "password-error" : "password-hint"}
            />
            <button type="button" className={styles.reveal} onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword}>
              {showPassword ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
            </button>
          </div>
          {errors.password ? (
            <p className={styles.fieldError} id="password-error">{errors.password}</p>
          ) : (
            <p className={styles.hint} id="password-hint">At least 8 characters.</p>
          )}
        </div>

        {status.kind === "error" ? <p className={styles.formError} role="alert">{status.message}</p> : null}
        {status.kind === "success" ? <p className={styles.formSuccess} role="status">{status.message}</p> : null}

        <Button type="submit" variant="primary" size="lg" block loading={status.kind === "loading" && status.via === "email"} disabled={loading}>
          {status.kind === "loading" && status.via === "email" ? "Creating account" : "Create account"}
          {status.kind === "loading" ? null : <ArrowRight size={17} aria-hidden="true" />}
        </Button>
      </form>

      <p className={styles.small}>Returning? Use Google. Email sign-in is planned.</p>
    </div>
  );
}
