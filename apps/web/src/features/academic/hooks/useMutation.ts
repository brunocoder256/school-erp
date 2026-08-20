import { useCallback, useState } from "react";

export interface MutationState<T> {
  data: T | null;
  error: Error | null;
  isPending: boolean;
}

export interface UseMutationResult<T> extends MutationState<T> {
  execute: (fn: () => Promise<T>) => Promise<T | undefined>;
  reset: () => void;
}

/**
 * Tracks create/update/delete mutations. `execute` runs the async fn and
 * exposes pending/error state so forms can disable submit and surface
 * validation errors without refetching.
 */
export function useMutation<T = unknown>(): UseMutationResult<T> {
  const [state, setState] = useState<MutationState<T>>({
    data: null,
    error: null,
    isPending: false,
  });

  const execute = useCallback(async (fn: () => Promise<T>) => {
    setState({ data: null, error: null, isPending: true });
    try {
      const data = await fn();
      setState({ data, error: null, isPending: false });
      return data;
    } catch (error) {
      setState({
        data: null,
        error: error instanceof Error ? error : new Error(String(error)),
        isPending: false,
      });
      throw error;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ data: null, error: null, isPending: false });
  }, []);

  return { ...state, execute, reset };
}
