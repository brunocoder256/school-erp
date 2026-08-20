import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { Spinner } from "@/components/feedback/spinner";
import { type AsyncStatus } from "@/features/academic/hooks/useAsync";

export interface DataViewProps {
  status: AsyncStatus;
  error: Error | null;
  children: ReactNode;
  empty: ReactNode;
  loadingFallback?: ReactNode;
  errorFallback?: ReactNode;
  reload: () => void;
}

/**
 * Consistent loading / error / empty orchestration for any async list or
 * detail view. Pass `null` as children to render the empty state.
 */
export function DataView({
  status,
  error,
  children,
  empty,
  loadingFallback,
  errorFallback,
  reload,
}: DataViewProps) {
  if (status === "loading") {
    return loadingFallback ?? <Spinner />;
  }

  if (status === "error") {
    if (errorFallback) return <>{errorFallback}</>;
    return (
      <ErrorState
        description={error?.message ?? "Failed to load data."}
        action={
          <Button type="button" variant="ghost" size="sm" onClick={reload}>
            Retry
          </Button>
        }
      />
    );
  }

  if (children === null || children === undefined) {
    return <>{empty}</>;
  }

  return <>{children}</>;
}
