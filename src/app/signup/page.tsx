import type { Metadata } from "next";
import { SignupExperience } from "./signup-experience";

export const metadata: Metadata = {
  title: "Create your LeadGen account",
  description: "Start finding evidence-backed opportunities for your agency.",
};

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <SignupExperience callbackFailed={error === "oauth_callback_failed"} />;
}
