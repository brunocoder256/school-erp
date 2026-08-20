import type { ReactNode } from "react";

export function formatDate(value: string | undefined | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(value: string | undefined | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export type StatusVariant = "default" | "success" | "warning" | "danger";

export function activeVariant(isActive: boolean): StatusVariant {
  return isActive ? "success" : "warning";
}

export function statusVariant(status: string): StatusVariant {
  switch (status) {
    case "ACTIVE":
      return "success";
    case "INACTIVE":
    case "SUSPENDED":
    case "PENDING":
    case "HOLD":
      return "warning";
    case "WITHDRAWN":
    case "TRANSFERRED":
    case "LEFT":
    case "FAILED":
      return "danger";
    case "COMPLETED":
    case "PROMOTED":
      return "success";
    default:
      return "default";
  }
}

export function initials(name: string | undefined | null): string {
  if (!name) return "—";
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "—";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase().slice(0, 2);
}

export function joinName(parts: {
  firstName: string;
  middleName?: string | null;
  lastName: string;
  preferredName?: string | null;
}): string {
  const { firstName, middleName, lastName, preferredName } = parts;
  if (preferredName) return `${preferredName} ${lastName}`;
  const full = [firstName, middleName, lastName].filter(Boolean).join(" ");
  return full.length > 0 ? full : preferredName ?? "—";
}

export type { ReactNode };
