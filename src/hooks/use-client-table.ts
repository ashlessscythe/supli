"use client";

import { useMemo, useState } from "react";

export type SortDirection = "asc" | "desc";

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
export const ALL_PAGE_SIZE = -1;

interface UseClientTableOptions<T, SortKey extends string> {
  data: T[];
  initialSortKey: SortKey;
  initialSortDirection?: SortDirection;
  initialPageSize?: number;
  initialSearch?: string;
  filterFn: (item: T, search: string) => boolean;
  compareFn: (a: T, b: T, sortKey: SortKey) => number;
}

export function useClientTable<T, SortKey extends string>({
  data,
  initialSortKey,
  initialSortDirection = "asc",
  initialPageSize = 25,
  initialSearch = "",
  filterFn,
  compareFn,
}: UseClientTableOptions<T, SortKey>) {
  const [search, setSearch] = useState(initialSearch);
  const [sortKey, setSortKey] = useState<SortKey>(initialSortKey);
  const [sortDirection, setSortDirection] =
    useState<SortDirection>(initialSortDirection);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [page, setPage] = useState(0);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
    setPage(0);
  };

  const setSearchAndReset = (value: string) => {
    setSearch(value);
    setPage(0);
  };

  const setPageSizeAndReset = (value: number) => {
    setPageSize(value);
    setPage(0);
  };

  const resetPage = () => setPage(0);

  const filteredSorted = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = data.filter((item) => filterFn(item, term));
    return [...filtered].sort((a, b) => {
      const comparison = compareFn(a, b, sortKey);
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [data, search, sortKey, sortDirection, filterFn, compareFn]);

  const total = filteredSorted.length;
  const showAll = pageSize === ALL_PAGE_SIZE;
  const pageCount = showAll ? 1 : Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const paginated = showAll
    ? filteredSorted
    : filteredSorted.slice(
        currentPage * pageSize,
        currentPage * pageSize + pageSize
      );

  const rangeStart = total === 0 ? 0 : showAll ? 1 : currentPage * pageSize + 1;
  const rangeEnd = showAll
    ? total
    : Math.min(currentPage * pageSize + pageSize, total);

  return {
    search,
    setSearch: setSearchAndReset,
    sortKey,
    sortDirection,
    toggleSort,
    pageSize,
    setPageSize: setPageSizeAndReset,
    page: currentPage,
    setPage,
    resetPage,
    pageCount,
    showAll,
    total,
    rangeStart,
    rangeEnd,
    paginated,
  };
}
