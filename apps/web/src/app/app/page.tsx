"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * The navigation shell homes at `/app`. The dashboard itself lives at `/`,
 * so redirect `/app` to the home route to keep a single source of truth.
 */
export default function AppIndexPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/");
  }, [router]);
  return null;
}
