import styles from "./monogram.module.css";

const TINTS = ["blue", "sand", "teal", "plum", "rust"] as const;

function hash(text: string): number {
  let total = 0;
  for (const char of text) total = (total * 31 + char.charCodeAt(0)) >>> 0;
  return total;
}

function initials(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  return ((words[0]?.[0] ?? "") + (words[1]?.[0] ?? "")).toUpperCase();
}

/**
 * Initials tile with a tint chosen from the business name, so the same business always looks the same.
 * Decorative only: the name is always written next to it.
 */
export function Monogram({ name, size = 40 }: { name: string; size?: number }) {
  const tint = TINTS[hash(name) % TINTS.length];
  return (
    <span className={`${styles.tile} ${styles[tint]}`} style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }} aria-hidden="true">
      {initials(name)}
    </span>
  );
}
