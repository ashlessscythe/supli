"use client";

import { createContext, useContext } from "react";
import { DEFAULT_SITE_TIMEZONE } from "@/lib/timezone";
import { formatDate } from "@/lib/utils";

const SiteTimezoneContext = createContext<string>(DEFAULT_SITE_TIMEZONE);

export function SiteTimezoneProvider({
  timeZone,
  children,
}: {
  timeZone: string;
  children: React.ReactNode;
}) {
  return (
    <SiteTimezoneContext.Provider value={timeZone || DEFAULT_SITE_TIMEZONE}>
      {children}
    </SiteTimezoneContext.Provider>
  );
}

export function useSiteTimezone() {
  return useContext(SiteTimezoneContext);
}

/** Formats a date using the active site display timezone. */
export function useFormatDate() {
  const timeZone = useSiteTimezone();
  return (date: Date | string) => formatDate(date, timeZone);
}
