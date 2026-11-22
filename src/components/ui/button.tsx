import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { LoaderCircle } from "lucide-react";
import styles from "./ui.module.css";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

export function buttonClass(variant: Variant = "secondary", size: Size = "md", block = false, extra?: string) {
  return [styles.button, styles[variant], size !== "md" ? styles[size] : "", block ? styles.block : "", extra ?? ""]
    .filter(Boolean)
    .join(" ");
}

type ButtonProps = ComponentProps<"button"> & {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  loading?: boolean;
  icon?: ReactNode;
};

export function Button({ variant, size, block, loading = false, icon, className, children, disabled, type = "button", ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClass(variant, size, block, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <LoaderCircle className={styles.spin} size={16} aria-hidden="true" /> : icon}
      {children}
    </button>
  );
}

type LinkButtonProps = ComponentProps<typeof Link> & { variant?: Variant; size?: Size; block?: boolean; icon?: ReactNode };

export function LinkButton({ variant, size, block, icon, className, children, ...rest }: LinkButtonProps) {
  return (
    <Link className={buttonClass(variant, size, block, className)} {...rest}>
      {icon}
      {children}
    </Link>
  );
}
