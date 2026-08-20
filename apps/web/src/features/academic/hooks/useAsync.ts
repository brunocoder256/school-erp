import { useCallback, useEffect, useRef, useState } from "react";

export type AsyncStatus = "idle" | "loading" | "success" | "error";

export interface AsyncState<T> {
  data: T | null;
  error: Error | null;
  status: AsyncStatus;
}

export interface UseAsyncState<T> extends AsyncState<T> {
  execute: (fn: () => Promise<T>) => Promise<T | undefined>;
  reset: () => void;
}

export interface UseAsyncListState<T> {
  items: T[];
  filtered: T[];
  error: Error | null;
  status: AsyncStatus;
  setFilter: (value: string) => void;
  reload: () => void;
}

/**
 * Generic one-shot async loader. Call `execute(fn)` to run; state updates
 * automatically. Returns a stable `execute` reference.
 */
export function useAsync<T>(): UseAsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    error: null,
    status: "idle",
  });

  const execute = useCallback(async (fn: () => Promise<T>) => {
    setState((s) => ({ ...s, status: "loading", error: null }));
    try {
      const data = await fn();
      setState({ data, error: null, status: "success" });
      return data;
    } catch (error) {
      setState({
        data: null,
        error: error instanceof Error ? error : new Error(String(error)),
        status: "error",
      });
      return undefined;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ data: null, error: null, status: "idle" });
  }, []);

  return { ...state, execute, reset };
}

/**
 * Loads a list on mount and exposes a client-side text filter. Used where the
 * backend does not expose server-side search (e.g. academic years, subjects,
 * staff, teaching assignments). The full loaded set is retained so filters
 * never issue extra round trips.
 */
export function useAsyncList<T>(
  fn: () => Promise<T[]>,
  options: { filter?: (item: T, text: string) => boolean } = {},
): UseAsyncListState<T> {
  const [items, setItems] = useState<T[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [status, setStatus] = useState<AsyncStatus>("loading");
  const [filter, setFilter] = useState("");
  const fnRef = useRef(fn);

  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);

  const load = useCallback(() => {
    const controller = new AbortController();
    fnRef.current()
      .then((data) => {
        if (controller.signal.aborted) return;
        setItems(data);
        setStatus("success");
      })
      .catch((e: unknown) => {
        if (controller.signal.aborted) return;
        setError(e instanceof Error ? e : new Error(String(e)));
        setStatus("error");
      });
    return () => controller.abort();
  }, []);

  useEffect(() => load(), []); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered =
    !filter || !options.filter
      ? items
      : items.filter((item) => options.filter!(item, filter));

  return {
    items,
    filtered,
    error,
    status,
    setFilter,
    reload: load,
  };
}
