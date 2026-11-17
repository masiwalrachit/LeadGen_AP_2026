const FALLBACK_PATH = "/onboarding";

export function safeNextPath(value: string | null): string {
  if (!value?.startsWith("/") || value.startsWith("//")) {
    return FALLBACK_PATH;
  }

  return value;
}
