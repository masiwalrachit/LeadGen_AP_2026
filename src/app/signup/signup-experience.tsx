"use client";

import { useMemo, useState, type FormEvent } from "react";
import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  Radar,
} from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import styles from "./signup.module.css";

type FormStatus =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "success"; message: string };

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20">
      <path
        fill="#4285F4"
        d="M21.6 12.23c0-.71-.06-1.23-.2-1.78H12v3.39h5.52a4.8 4.8 0 0 1-2.05 3.07l-.02.11 2.98 2.31.21.02c1.9-1.76 2.96-4.35 2.96-7.12Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.97-.89 6.64-2.65l-3.17-2.44c-.85.59-1.97 1-3.47 1a6.03 6.03 0 0 1-5.7-4.17l-.1.01-3.1 2.4-.04.1A10.02 10.02 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.3 13.74a6.2 6.2 0 0 1-.32-1.95c0-.68.12-1.34.31-1.95l-.01-.13-3.14-2.44-.1.05A10 10 0 0 0 2 11.79c0 1.61.38 3.14 1.06 4.47l3.24-2.52Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.68c1.88 0 3.15.81 3.88 1.48l2.83-2.77A9.62 9.62 0 0 0 12 1.58a10.02 10.02 0 0 0-8.94 5.74L6.3 9.84A6.05 6.05 0 0 1 12 5.68Z"
      />
    </svg>
  );
}

export function SignupExperience() {
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<FormStatus>({ kind: "idle" });
  const configured = useMemo(() => isSupabaseConfigured(), []);

  async function signUpWithGoogle() {
    if (!configured) {
      setStatus({
        kind: "error",
        message: "Connect Supabase in .env.local before using Google sign-up.",
      });
      return;
    }

    setStatus({ kind: "loading" });

    try {
      const supabase = createClient();
      const redirectTo = `${window.location.origin}/auth/callback?next=/onboarding`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });

      if (error) throw error;
    } catch (error) {
      setStatus({
        kind: "error",
        message:
          error instanceof Error
            ? error.message
            : "Google sign-up could not start. Please try again.",
      });
    }
  }

  async function signUpWithEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!configured) {
      setStatus({
        kind: "error",
        message: "Connect Supabase in .env.local before creating an account.",
      });
      return;
    }

    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");

    if (password.length < 8) {
      setStatus({
        kind: "error",
        message: "Use at least 8 characters for your password.",
      });
      return;
    }

    setStatus({ kind: "loading" });

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
        },
      });

      if (error) throw error;

      setStatus({
        kind: "success",
        message: "Check your inbox to confirm your email and finish setup.",
      });
      event.currentTarget.reset();
    } catch (error) {
      setStatus({
        kind: "error",
        message:
          error instanceof Error
            ? error.message
            : "Your account could not be created. Please try again.",
      });
    }
  }

  const loading = status.kind === "loading";

  return (
    <main className={styles.shell}>
      <section className={styles.signalPanel} aria-label="How LeadGen qualifies opportunities">
        <div className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true">
            LG
          </span>
          <span>LeadGen</span>
        </div>

        <div className={styles.signalField} aria-hidden="true">
          <span className={`${styles.orbit} ${styles.orbitOne}`} />
          <span className={`${styles.orbit} ${styles.orbitTwo}`} />
          <span className={`${styles.orbit} ${styles.orbitThree}`} />
          <span className={`${styles.node} ${styles.nodeOne}`} />
          <span className={`${styles.node} ${styles.nodeTwo}`} />
          <span className={`${styles.node} ${styles.nodeThree}`} />
          <div className={styles.scanLine} />
        </div>

        <div className={styles.story}>
          <div className={styles.storyIcon}>
            <Radar size={20} strokeWidth={1.7} />
          </div>
          <h1>Find the reason to reach out.</h1>
          <p>
            LeadGen connects business changes, website signals, and public
            evidence into opportunities your agency can actually evaluate.
          </p>
        </div>

        <div className={styles.evidenceStrip}>
          <div>
            <span>Signal found</span>
            <strong>New clinic opening</strong>
          </div>
          <div>
            <span>Website check</span>
            <strong>No official site</strong>
          </div>
          <div className={styles.qualified}>
            <Check size={16} aria-hidden="true" />
            <span>Qualified</span>
          </div>
        </div>
      </section>

      <section className={styles.formPanel}>
        <div className={styles.formWrap}>
          <div className={styles.mobileBrand}>
            <span className={styles.brandMark} aria-hidden="true">
              LG
            </span>
            <span>LeadGen</span>
          </div>

          <header className={styles.header}>
            <h2>Create your workspace</h2>
            <p>
              Start with one campaign. We’ll help you find the evidence behind
              every opportunity.
            </p>
          </header>

          <button
            className={styles.googleButton}
            type="button"
            onClick={signUpWithGoogle}
            disabled={loading}
          >
            {loading ? (
              <LoaderCircle className={styles.spinner} size={20} />
            ) : (
              <GoogleMark />
            )}
            Continue with Google
          </button>

          <div className={styles.divider}>
            <span>or use your work email</span>
          </div>

          <form className={styles.form} onSubmit={signUpWithEmail}>
            <label>
              <span>Full name</span>
              <input
                name="name"
                type="text"
                autoComplete="name"
                placeholder="Rachit Masiwal"
                required
              />
            </label>

            <label>
              <span>Work email</span>
              <input
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@agency.com"
                required
              />
            </label>

            <label>
              <span>Password</span>
              <div className={styles.passwordField}>
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </div>
            </label>

            <p className={styles.passwordNote}>
              <LockKeyhole size={14} aria-hidden="true" />
              Use 8 or more characters.
            </p>

            {status.kind === "error" || status.kind === "success" ? (
              <p
                className={
                  status.kind === "error" ? styles.error : styles.success
                }
                role={status.kind === "error" ? "alert" : "status"}
                aria-live="polite"
              >
                {status.message}
              </p>
            ) : null}

            <button className={styles.submitButton} disabled={loading}>
              {loading ? (
                <>
                  <LoaderCircle className={styles.spinner} size={19} />
                  Creating workspace
                </>
              ) : (
                <>
                  Create workspace
                  <ArrowRight size={19} aria-hidden="true" />
                </>
              )}
            </button>
          </form>

          <p className={styles.terms}>
            By continuing, you agree to the Terms and Privacy Policy.
          </p>

          <p className={styles.signIn}>
            Already have an account? Sign in is coming next.
          </p>
        </div>
      </section>
    </main>
  );
}
