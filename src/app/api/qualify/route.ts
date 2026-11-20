import { NextResponse } from "next/server";
import { z } from "zod";
import { CsvFormatError, parseCandidateCsv } from "@/lib/qualification/csv";
import { validateCandidateWebsites } from "@/lib/qualification/website-validator";
import { persistValidationRun } from "@/lib/qualification/persist";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const campaignSchema = z.object({
  name: z.string().trim().min(3).max(140),
  service: z.enum(["new-website", "redesign", "ecommerce", "maintenance"]),
  industry: z.string().trim().min(2).max(100),
  location: z.string().trim().min(2).max(150),
});

const serviceNames = {
  "new-website": "New website development",
  redesign: "Website redesign",
  ecommerce: "E-commerce development",
  maintenance: "Website maintenance and performance improvement",
} as const;

function overlaps(target: string, value: string): boolean {
  const normalizedTarget = target.toLowerCase().trim();
  const normalizedValue = value.toLowerCase().trim();
  return normalizedValue.includes(normalizedTarget) || normalizedTarget.includes(normalizedValue);
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    if (!data?.claims?.sub) {
      return NextResponse.json({ error: "Sign in before running qualification." }, { status: 401 });
    }

    const { data: membership, error: membershipError } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", data.claims.sub)
      .order("joined_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (membershipError) {
      return NextResponse.json(
        { error: "Workspace database setup is incomplete. Open /setup/database and apply the migration." },
        { status: 503 },
      );
    }
    if (!membership) {
      return NextResponse.json({ error: "Create or join a workspace before running qualification." }, { status: 403 });
    }

    const formData = await request.formData();
    const campaignResult = campaignSchema.safeParse({
      name: formData.get("name"),
      service: formData.get("service"),
      industry: formData.get("industry"),
      location: formData.get("location"),
    });
    if (!campaignResult.success) {
      return NextResponse.json({ error: "Complete every campaign field before running qualification." }, { status: 400 });
    }

    const file = formData.get("file");
    if (!(file instanceof File) || !file.name.toLowerCase().endsWith(".csv")) {
      return NextResponse.json({ error: "Upload a CSV file." }, { status: 400 });
    }
    if (file.size > 1_000_000) {
      return NextResponse.json({ error: "CSV files must be 1 MB or smaller." }, { status: 413 });
    }

    let parsed: ReturnType<typeof parseCandidateCsv>;
    try {
      parsed = parseCandidateCsv(await file.text());
    } catch (error) {
      if (error instanceof CsvFormatError) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      throw error;
    }
    const relevant = parsed.candidates.filter(
      (candidate) =>
        overlaps(campaignResult.data.industry, candidate.industry) &&
        overlaps(campaignResult.data.location, candidate.location),
    );
    const deterministicFilteredCount = parsed.candidates.length - relevant.length;
    if (relevant.length === 0) {
      return NextResponse.json(
        {
          error: "No valid candidates matched the campaign industry and location.",
          stats: {
            rowsAccepted: parsed.candidates.length,
            duplicatesRemoved: parsed.duplicateCount,
            invalidRows: parsed.issues.length,
            deterministicFiltered: deterministicFilteredCount,
          },
          issues: parsed.issues,
        },
        { status: 422 },
      );
    }
    if (relevant.length > 15) {
      return NextResponse.json(
        { error: "Website validation accepts up to 15 matching candidates per run. Split this CSV into smaller files." },
        { status: 413 },
      );
    }

    const validated = await validateCandidateWebsites(relevant, process.env.PAGESPEED_API_KEY);
    const campaignId = await persistValidationRun(supabase, {
      workspaceId: membership.workspace_id,
      userId: data.claims.sub,
      campaign: campaignResult.data,
      candidates: validated,
    });

    return NextResponse.json({
      campaign: {
        id: campaignId,
        ...campaignResult.data,
        serviceName: serviceNames[campaignResult.data.service],
        status: "completed",
      },
      candidates: validated,
      leads: [],
      model: null,
      stats: {
        rowsAccepted: parsed.candidates.length,
        duplicatesRemoved: parsed.duplicateCount,
        invalidRows: parsed.issues.length,
        deterministicFiltered: deterministicFilteredCount,
        validated: validated.length,
        qualified: 0,
        evidenceCollected: validated.reduce((total, candidate) => total + candidate.evidence.length, 0),
      },
      issues: parsed.issues,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Qualification failed unexpectedly.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
