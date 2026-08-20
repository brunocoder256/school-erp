import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { activeVariant, statusVariant, type StatusVariant } from "../utils/formatters";

export type { StatusVariant };

export interface StatusBadgeProps {
  isActive?: boolean;
  status?: string;
  children: ReactNode;
  className?: string;
}

export function StatusBadge({
  isActive,
  status,
  children,
  className,
}: StatusBadgeProps) {
  const variant: StatusVariant =
    status !== undefined ? statusVariant(status) : activeVariant(!!isActive);
  const label = children;

  return (
    <Badge variant={variant} className={cn(className)}>
      {label}
    </Badge>
  );
}

export function BooleanBadge({ value }: { value: boolean }) {
  return (
    <Badge variant={value ? "success" : "warning"}>
      {value ? "Yes" : "No"}
    </Badge>
  );
}
