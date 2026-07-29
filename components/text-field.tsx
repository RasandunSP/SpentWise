import type { InputHTMLAttributes, ReactNode } from "react";

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: ReactNode;
};

/**
 * A rule and a label — no box, no fill. Filled fields would put a second grey
 * rectangle beside every figure on the page; a hairline that thickens into the
 * accent on focus says the same thing with far less furniture.
 */
export function TextField({
  label,
  hint,
  id,
  className = "",
  ...props
}: TextFieldProps) {
  const inputId = id ?? props.name;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={inputId} className="text-label uppercase text-ink-faint">
        {label}
      </label>

      <input
        id={inputId}
        className={`peer w-full border-0 border-b border-line bg-transparent px-0 pb-2.5 pt-1.5
          text-title font-normal text-ink placeholder:font-light placeholder:text-ink-faint
          transition-colors focus:border-accent focus:outline-none focus:ring-0 ${className}`}
        {...props}
      />

      {hint ? <p className="pt-1.5 text-meta text-ink-faint">{hint}</p> : null}
    </div>
  );
}
