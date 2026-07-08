"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ALL_PAGE_SIZE,
  PAGE_SIZE_OPTIONS,
} from "@/hooks/use-client-table";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface TablePaginationProps {
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  page: number;
  pageCount: number;
  showAll: boolean;
  rangeStart: number;
  rangeEnd: number;
  total: number;
  onPrevious: () => void;
  onNext: () => void;
}

export function TablePagination({
  pageSize,
  onPageSizeChange,
  page,
  pageCount,
  showAll,
  rangeStart,
  rangeEnd,
  total,
  onPrevious,
  onNext,
}: TablePaginationProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Rows per page</span>
        <Select
          value={String(pageSize)}
          onValueChange={(value) => onPageSizeChange(Number(value))}
        >
          <SelectTrigger className="h-8 w-[80px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZE_OPTIONS.map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size}
              </SelectItem>
            ))}
            <SelectItem value={String(ALL_PAGE_SIZE)}>All</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground">
          {rangeStart}–{rangeEnd} of {total}
        </span>
        {!showAll && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onPrevious}
              disabled={page === 0}
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only sm:not-sr-only">Previous</span>
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page + 1} of {pageCount}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={onNext}
              disabled={page >= pageCount - 1}
            >
              <span className="sr-only sm:not-sr-only">Next</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
