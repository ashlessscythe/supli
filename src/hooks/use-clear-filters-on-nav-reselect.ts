"use client";

import { useEffect } from "react";
import { NAV_RESELECT_EVENT } from "@/lib/nav-reselect";

/** Clears list filters when the user re-clicks the current sidebar/header nav item. */
export function useClearFiltersOnNavReselect(clearFilters: () => void) {
  useEffect(() => {
    const handler = () => {
      clearFilters();
    };
    window.addEventListener(NAV_RESELECT_EVENT, handler);
    return () => window.removeEventListener(NAV_RESELECT_EVENT, handler);
  }, [clearFilters]);
}
