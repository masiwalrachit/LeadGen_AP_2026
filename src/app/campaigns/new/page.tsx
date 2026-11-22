import { redirect } from "next/navigation";

// Old address kept so existing links still work.
export default function LegacyNewCampaignPage() {
  redirect("/analyze-leads");
}
