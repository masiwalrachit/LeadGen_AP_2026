import type { SupabaseClient } from "@supabase/supabase-js";
import type { ValidatedCandidate } from "./types";

type Campaign = { name: string; service: string; industry: string; location: string };

export async function persistValidationRun(
  supabase: SupabaseClient,
  input: { workspaceId: string; userId: string; campaign: Campaign; candidates: ValidatedCandidate[] },
) {
  const { data: campaign, error: campaignError } = await supabase.from("campaigns").insert({
    workspace_id: input.workspaceId, created_by: input.userId, name: input.campaign.name, service: input.campaign.service,
    target_industry: input.campaign.industry, target_location: input.campaign.location, status: "validating",
  }).select("id").single();
  if (campaignError) throw new Error(`Campaign persistence failed. Apply supabase/migrations/202611200004_qualification_pipeline.sql, then retry. ${campaignError.message}`);

  try {
    for (const candidate of input.candidates) {
      const { data: stored, error } = await supabase.from("candidates").insert({
        campaign_id: campaign.id, import_row_id: candidate.id, business_name: candidate.businessName,
        industry: candidate.industry, location: candidate.location, website_url: candidate.website,
        source_url: candidate.sourceUrl, observed_at: candidate.observedAt,
        qualification_status: "pending",
      }).select("id").single();
      if (error) throw error;
      const evidenceRows = candidate.evidence.map((item) => ({
        candidate_id: stored.id, evidence_key: item.id, source_type: item.sourceType, source_url: item.sourceUrl,
        observed_at: item.observedAt, validator: item.validator, signal_code: item.signalCode,
        observation: item.observation, extracted_value: item.extractedValue,
      }));
      const { error: evidenceError } = await supabase.from("evidence").insert(evidenceRows);
      if (evidenceError) throw evidenceError;
    }
    const { error } = await supabase.from("campaigns").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", campaign.id);
    if (error) throw error;
    return campaign.id as string;
  } catch (error) {
    await supabase.from("campaigns").update({ status: "failed", completed_at: new Date().toISOString() }).eq("id", campaign.id);
    throw new Error(`Qualification persistence failed: ${error instanceof Error ? error.message : "unknown database error"}`);
  }
}
