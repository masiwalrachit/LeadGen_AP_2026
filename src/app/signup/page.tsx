import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isDemoMode } from "@/lib/demo/mode";
import { readDemoSession } from "@/lib/demo/session";
import { getRecord } from "@/features/demo/data";
import { buildBrief } from "@/features/leads/brief";
import { Brand } from "@/components/ui/misc";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { SignupForm } from "./signup-form";
import { Specimen } from "./specimen";
import styles from "./signup.module.css";

export const metadata: Metadata = {
  title: "Create your account",
  description: "Start finding evidence-backed opportunities for your agency.",
};

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const demo = isDemoMode();
  if (demo) {
    const { user } = await readDemoSession();
    if (user) redirect("/app");
  }
  const { error } = await searchParams;
  const specimen = getRecord("northstar-dental");
  const brief = specimen ? buildBrief(specimen) : null;

  return (
    <div className={styles.page}>
      <main className={styles.formSide} id="main">
        <div className={styles.mobileBrand}>
          <Brand href="/signup" />
          <ThemeToggle />
        </div>
        <SignupForm demo={demo} callbackFailed={error === "oauth_callback_failed"} />
      </main>
      <section className={styles.story} aria-labelledby="story-title">
        <div className={styles.storyTop}>
          <Brand href="/signup" />
          <ThemeToggle />
        </div>
        <div className={`${styles.storyBody} enter`}>
          <h2 className={styles.headline} id="story-title">
            Find the reason <em>to reach out.</em>
          </h2>
          <p className={styles.lede}>Every claim about a business comes with its public source.</p>
          {specimen && brief ? (
            <Specimen
              name={specimen.businessName}
              meta={`${specimen.industry} · ${specimen.location}`}
              score={specimen.finalScore}
              parts={brief.parts}
              sources={brief.sources.map((source) => ({
                n: source.n,
                label: source.label,
                code: source.evidence.signalCode,
                validator: source.evidence.validator,
                observedAt: source.evidence.observedAt,
                url: source.evidence.sourceUrl,
                kind: source.kind,
              }))}
            />
          ) : null}
        </div>
      </section>
    </div>
  );
}
