"use client";

import { useCallback, useEffect, useState } from "react";

export type SupplyDetailViewMode = "scroll" | "tabs";

const STORAGE_KEY = "supli-supply-detail-view";

function isValidViewMode(value: string | null): value is SupplyDetailViewMode {
  return value === "scroll" || value === "tabs";
}

export function useSupplyDetailViewMode() {
  const [viewMode, setViewModeState] = useState<SupplyDetailViewMode>("scroll");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isValidViewMode(stored)) {
      setViewModeState(stored);
    }
  }, []);

  const setViewMode = useCallback((mode: SupplyDetailViewMode) => {
    setViewModeState(mode);
    localStorage.setItem(STORAGE_KEY, mode);
  }, []);

  return { viewMode, setViewMode };
}
