import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useAsync, useAsyncList } from "@/features/academic/hooks";

describe("useAsync hooks", () => {
  it("useAsync succeeds and exposes data", async () => {
    const { result } = renderHook(() => useAsync<string>());
    const data = await act(() =>
      result.current.execute(() => Promise.resolve("ok")),
    );
    expect(data).toBe("ok");
    expect(result.current.status).toBe("success");
    expect(result.current.data).toBe("ok");
    expect(result.current.error).toBeNull();
  });

  it("useAsync captures errors", async () => {
    const { result } = renderHook(() => useAsync<string>());
    await act(() =>
      result.current.execute(() => Promise.reject(new Error("boom"))),
    );
    expect(result.current.status).toBe("error");
    expect(result.current.error?.message).toBe("boom");
    expect(result.current.data).toBeNull();
  });

  it("useAsyncList loads and filters client-side", async () => {
    const load = () =>
      Promise.resolve([
        { id: "1", name: "Alpha" },
        { id: "2", name: "Beta" },
        { id: "3", name: "Alphabet" },
      ]);
    const { result } = renderHook(() =>
      useAsyncList(load, {
        filter: (item, text) =>
          item.name.toLowerCase().includes(text.toLowerCase()),
      }),
    );

    expect(result.current.status).toBe("loading");
    await vi.waitFor(() => expect(result.current.status).toBe("success"));
    expect(result.current.items).toHaveLength(3);
    expect(result.current.filtered).toHaveLength(3);

    act(() => result.current.setFilter("alpha"));
    expect(result.current.filtered).toHaveLength(2);

    act(() => result.current.setFilter("beta"));
    expect(result.current.filtered).toHaveLength(1);
  });
});
