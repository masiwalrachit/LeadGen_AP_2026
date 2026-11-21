const DASHBOARD = "https://supabase.com/dashboard";

/** Link to this project's SQL editor, derived from the configured project URL; never a hardcoded project. */
export function supabaseSqlEditorUrl(projectUrl: string | undefined): string {
  try {
    const host = new URL(projectUrl ?? "").hostname;
    const ref = host.match(/^([a-z0-9]+)\.supabase\.(?:co|in)$/)?.[1];
    return ref ? `${DASHBOARD}/project/${ref}/sql/new` : DASHBOARD;
  } catch {
    return DASHBOARD;
  }
}
