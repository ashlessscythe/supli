export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export function getPagination({ page = 1, pageSize = 25 }: PaginationParams) {
  const safePage = Math.max(1, page);
  const safeSize = Math.min(100, Math.max(1, pageSize));
  return {
    skip: (safePage - 1) * safeSize,
    take: safeSize,
    page: safePage,
    pageSize: safeSize,
  };
}
