import type { InputHTMLAttributes } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";

export interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export function FormInput({
  label,
  error,
  helperText,
  className,
  ...props
}: FormFieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label ? (
        <label className="text-sm font-medium text-foreground">{label}</label>
      ) : null}
      <Input aria-invalid={!!error} aria-describedby={error ? `${props.id}-error` : undefined} {...props} />
      {error ? (
        <span id={`${props.id}-error`} className="text-xs text-danger">
          {error}
        </span>
      ) : null}
      {helperText && !error ? (
        <span className="text-xs text-muted-foreground">{helperText}</span>
      ) : null}
    </div>
  );
}
