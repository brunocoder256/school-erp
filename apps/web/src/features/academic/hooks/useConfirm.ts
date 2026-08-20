import { useCallback } from "react";

/**
 * Returns a `confirm` helper that wraps `window.confirm`. Centralising this
 * allows dangerous operations (deactivate / remove) to be audited in one
 * place and swapped for a real dialog later.
 */
export function useConfirm(message = "Are you sure?") {
  return useCallback(
    (customMessage?: string) =>
      typeof window !== "undefined"
        ? window.confirm(customMessage ?? message)
        : false,
    [message],
  );
}
