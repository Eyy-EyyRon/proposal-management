"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "hyacinth_perf_mode";

export function usePerformanceMode() {
  const [perfMode, setPerfMode] = useState<boolean>(false);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
    if (stored === "true") setPerfMode(true);
  }, []);

  const toggle = () => {
    setPerfMode((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, String(next));
      }
      return next;
    });
  };

  return { perfMode, toggle };
}
