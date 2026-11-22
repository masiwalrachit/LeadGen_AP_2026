"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { isDemoMode } from "@/lib/demo/mode";
import { endDemoSession } from "@/lib/demo/session-client";

/**
 * Real mode: POSTs to /auth/signout (unchanged backend route).
 * Demo mode: clears the demo session cookies and local demo state, then returns to sign-up.
 */
export function SignOutButton({ className }: { className?: string }) {
  const router = useRouter();

  if (isDemoMode()) {
    return (
      <button
        className={className}
        type="button"
        onClick={() => {
          endDemoSession();
          router.replace("/signup");
          router.refresh();
        }}
      >
        <LogOut size={15} aria-hidden="true" />
        Sign out
      </button>
    );
  }

  return (
    <form action="/auth/signout" method="post">
      <button className={className} type="submit">
        <LogOut size={15} aria-hidden="true" />
        Sign out
      </button>
    </form>
  );
}
