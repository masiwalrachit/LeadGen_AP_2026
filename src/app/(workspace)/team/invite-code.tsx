"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import styles from "./team.module.css";

export default function InviteCode({ code }: { code: string }) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const resetTimer = useRef<number | null>(null);

  useEffect(() => () => {
    if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);
  }, []);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopyState("copied");
      if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);
      resetTimer.current = window.setTimeout(() => setCopyState("idle"), 1800);
    } catch {
      setCopyState("error");
    }
  }

  return (
    <div className={styles.inviteControl}>
      <code>{code}</code>
      <button type="button" onClick={copyCode} aria-label="Copy workspace join code">
        {copyState === "copied" ? <Check size={17} aria-hidden="true" /> : <Copy size={17} aria-hidden="true" />}
        <span>{copyState === "copied" ? "Copied" : "Copy code"}</span>
      </button>
      <span className={styles.copyStatus} role="status" aria-live="polite">
        {copyState === "error" ? "Copy failed. Select the code and copy it manually." : ""}
      </span>
    </div>
  );
}
