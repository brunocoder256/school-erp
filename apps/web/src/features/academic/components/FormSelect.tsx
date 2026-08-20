import type { SelectHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface FormSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
}

export function FormSelect({
  label,
  error,
  options,
  placeholder = "Select…",
  className,
  ...props
}: FormSelectProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label ? (
        <label className="text-sm font-medium text-foreground">{label}</label>
      ) : null}
      <select
        aria-invalid={!!error}
        className={cn(
          "w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        )}
        {...props}
      >
        {placeholder ? (
          <option value="" disabled hidden>
            {placeholder}
          </option>
        ) : null}
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>
      {error ? <span className="text-xs text-danger">{error}</span> : null}
    </div>
  );
}
