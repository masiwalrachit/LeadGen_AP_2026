import styles from "./score-ring.module.css";

type ScoreRingProps = {
  value: number;
  /** Diameter in px. The number inside always shows, so the score never depends on colour alone. */
  size?: number;
  /** Animate the arc from empty on first paint (off under prefers-reduced-motion). */
  animate?: boolean;
  label?: string;
};

/** Circular score gauge drawn with one SVG circle. One colour, number inside, no colour-only meaning. */
export function ScoreRing({ value, size = 48, animate = false, label }: ScoreRingProps) {
  const stroke = Math.max(4, Math.round(size / 9));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, value));
  const offset = circumference * (1 - clamped / 100);

  return (
    <span
      className={styles.ring}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.34) }}
      role="img"
      aria-label={label ?? `Score ${clamped} out of 100`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle className={styles.track} cx={size / 2} cy={size / 2} r={radius} strokeWidth={stroke} fill="none" />
        <circle
          className={`${styles.arc} ${animate ? styles.animate : ""}`}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ ["--circumference" as string]: circumference, ["--offset" as string]: offset }}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span className={`${styles.value} tabular`}>{clamped}</span>
    </span>
  );
}
