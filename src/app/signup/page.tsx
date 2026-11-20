import type { Metadata } from "next";
import { SignupExperience } from "./signup-experience";

export const metadata: Metadata = {
  title: "Create your LeadGen account",
  description: "Start finding evidence-backed opportunities for your agency.",
};

export default function SignupPage() {
  return <SignupExperience />;
}
