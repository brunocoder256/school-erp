import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/cn";

interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: ReactNode;
  variant?: "default" | "success" | "warning" | "danger";
}

const variantClasses: Record<NonNullable<AlertProps["variant"]>, string> = {
  default: "border-border bg-muted/60 text-foreground",
  success: "border-success/30 bg-success/10 text-success",
  warning: "border-warning/30 bg-warning/10 text-warning",
  danger: "border-danger/30 bg-danger/10 text-danger",
};

export function Alert({
  title,
  description,
  variant = "default",
  className,
  ...props
}: AlertProps) {
  return (
    <div
      className={cn(
        "rounded-lg border p-4 text-sm",
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {title ? <p className="font-medium">{title}</p> : null}
      {description ? <div className={cn(title ? "mt-1" : "")}>{description}</div> : null}
    </div>
  );
}
