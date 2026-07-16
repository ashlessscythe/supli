"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SupplyDetailDialog } from "@/components/supplies/supply-detail-dialog";
import type { LowStockItem } from "@/lib/low-stock";

interface LowStockCardProps {
  count: number;
  items: LowStockItem[];
  suppliesHref: string;
}

export function LowStockCard({
  count,
  items,
  suppliesHref,
}: LowStockCardProps) {
  const [detailSupplyId, setDetailSupplyId] = useState<string | null>(null);
  const listHref = `${suppliesHref}?stock=low`;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            <Link
              href={listHref}
              className="hover:underline focus-visible:underline"
            >
              Low Stock Items
            </Link>
          </CardTitle>
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Link
              href={listHref}
              className="text-2xl font-bold hover:underline focus-visible:underline"
            >
              {count}
            </Link>
            <p className="text-xs text-muted-foreground">
              Items below minimum threshold
            </p>
          </div>

          {items.length > 0 ? (
            <ul className="space-y-1.5">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setDetailSupplyId(item.id)}
                    className="flex w-full items-baseline justify-between gap-2 rounded-sm text-left text-sm hover:underline focus-visible:underline"
                  >
                    <span className="truncate">{item.name}</span>
                    <span className="shrink-0 tabular-nums text-red-600 dark:text-red-400">
                      {item.quantity}/{item.minimumThreshold}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No low stock items</p>
          )}

          {count > items.length && (
            <Link
              href={listHref}
              className="text-xs text-muted-foreground hover:underline"
            >
              View all {count} low stock items
            </Link>
          )}
        </CardContent>
      </Card>

      <SupplyDetailDialog
        supplyId={detailSupplyId}
        open={detailSupplyId != null}
        onOpenChange={(open) => {
          if (!open) setDetailSupplyId(null);
        }}
      />
    </>
  );
}
