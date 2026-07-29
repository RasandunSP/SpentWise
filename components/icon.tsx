import type { CSSProperties } from "react";

type IconProps = {
  /** Ligature name from https://fonts.google.com/icons — e.g. "arrow_back". */
  name: string;
  size?: number;
  /** Solid variant. Reserved for the active nav destination. */
  filled?: boolean;
  /**
   * Stroke weight. Defaults to 250 — thin enough to sit beside 200-weight
   * display type without looking bolted on. Anything above 400 fights it.
   */
  weight?: 100 | 200 | 250 | 300 | 400 | 500;
  className?: string;
  style?: CSSProperties;
};

/** A single Material Symbol. The font is linked in app/layout.tsx. */
export function Icon({
  name,
  size = 22,
  filled = false,
  weight = 250,
  className = "",
  style,
}: IconProps) {
  return (
    <span
      aria-hidden="true"
      className={`material-symbols-outlined ${className}`}
      style={{
        fontSize: size,
        ["--symbol-fill" as string]: filled ? 1 : 0,
        ["--symbol-weight" as string]: weight,
        ...style,
      }}
    >
      {name}
    </span>
  );
}
