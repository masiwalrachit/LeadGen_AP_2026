"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";
import styles from "./ui.module.css";

const STORAGE_KEY = "leadgen.theme";

function currentTheme(): "light" | "dark" {
  const explicit = document.documentElement.getAttribute("data-theme");
  if (explicit === "light" || explicit === "dark") return explicit;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function subscribe(onChange: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  media.addEventListener("change", onChange);
  return () => {
    observer.disconnect();
    media.removeEventListener("change", onChange);
  };
}

/** Switches between Day Ledger and Night Ledger and remembers the choice on this device. */
export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, currentTheme, () => "light" as const);
  const next = theme === "dark" ? "light" : "dark";

  function toggle() {
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage unavailable: the choice lasts for this page view only.
    }
  }

  return (
    <button className={styles.themeToggle} type="button" onClick={toggle} aria-label={`Switch to ${next} theme`} title={`Switch to ${next} theme`}>
      {theme === "dark" ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}
    </button>
  );
}
