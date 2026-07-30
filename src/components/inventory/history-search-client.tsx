"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClearFiltersButton } from "@/components/ui/clear-filters-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { searchInventoryHistory } from "@/lib/actions/inventory-history";
import type { InventoryHistoryItem } from "@/lib/validation/inventory-history";
import { useClearFiltersOnNavReselect } from "@/hooks/use-clear-filters-on-nav-reselect";
import { useFormatDate } from "@/components/providers/site-timezone-provider";
import { cn } from "@/lib/utils";

const KIND_LABELS = {
  order: "Order",
  receipt: "Receipt",
  consumption: "Consumption",
} as const;

interface HistorySearchClientProps {
  initialResults: InventoryHistoryItem[];
  suppliesPath: string;
}

export function HistorySearchClient({
  initialResults,
  suppliesPath,
}: HistorySearchClientProps) {
  const formatDate = useFormatDate();
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<"all" | "order" | "receipt" | "consumption">(
    "all"
  );
  const [status, setStatus] = useState<string>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [results, setResults] = useState(initialResults);
  const [selected, setSelected] = useState<InventoryHistoryItem | null>(null);
  const [isPending, startTransition] = useTransition();

  const statusOptions = useMemo(
    () => [
      { value: "all", label: "Any status" },
      { value: "ORDERED", label: "Ordered" },
      { value: "PARTIALLY_RECEIVED", label: "Partially received" },
      { value: "RECEIVED", label: "Received" },
    ],
    []
  );

  const filtersActive =
    q.trim() !== "" ||
    kind !== "all" ||
    status !== "all" ||
    from !== "" ||
    to !== "";

  const clearFilters = useCallback(() => {
    setQ("");
    setKind("all");
    setStatus("all");
    setFrom("");
    setTo("");
    setResults(initialResults);
  }, [initialResults]);

  useClearFiltersOnNavReselect(clearFilters);

  const runSearch = () => {
    startTransition(async () => {
      const result = await searchInventoryHistory({
        q: q.trim() || undefined,
        kind,
        status: status === "all" ? undefined : (status as never),
        from: from || undefined,
        to: to || undefined,
        limit: 50,
      });

      if (!result.success) {
        toast.error(
          typeof result.error === "string"
            ? result.error
            : "Failed to search history"
        );
        return;
      }
      setResults(result.data);
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Search past orders, receipts, and consumptions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2 lg:col-span-2">
              <Label htmlFor="history-q">Search</Label>
              <Input
                id="history-q"
                placeholder="PO #, supply, vendor, notes, user…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") runSearch();
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={kind}
                onValueChange={(value) => setKind(value as typeof kind)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="order">Orders / POs</SelectItem>
                  <SelectItem value="receipt">Receipts</SelectItem>
                  <SelectItem value="consumption">Consumptions</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Order status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="history-from">From</Label>
              <Input
                id="history-from"
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="history-to">To</Label>
              <Input
                id="history-to"
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={runSearch} disabled={isPending}>
              <Search className="mr-2 h-4 w-4" />
              {isPending ? "Searching…" : "Search"}
            </Button>
            <ClearFiltersButton
              onClick={clearFilters}
              disabled={!filtersActive}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Results ({results.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {results.length === 0 ? (
            <p className="text-sm text-muted-foreground">No matching history.</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead>PO / Vendor</TableHead>
                    <TableHead>By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((item) => (
                    <TableRow
                      key={item.id}
                      className="cursor-pointer"
                      onClick={() => setSelected(item)}
                    >
                      <TableCell className="whitespace-nowrap text-sm">
                        {formatDate(item.date)}
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "text-xs font-medium uppercase tracking-wide",
                            item.kind === "order" &&
                              "text-sky-700 dark:text-sky-400",
                            item.kind === "receipt" &&
                              "text-emerald-700 dark:text-emerald-400",
                            item.kind === "consumption" &&
                              "text-amber-700 dark:text-amber-400"
                          )}
                        >
                          {KIND_LABELS[item.kind]}
                        </span>
                      </TableCell>
                      <TableCell>{item.supplyName}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {item.kind === "consumption" ? "−" : "+"}
                        {item.quantity}
                      </TableCell>
                      <TableCell className="max-w-[220px] truncate text-sm text-muted-foreground">
                        {[
                          item.externalPoNumber
                            ? `PO ${item.externalPoNumber}`
                            : null,
                          item.vendorName,
                          item.status?.toLowerCase().replace(/_/g, " "),
                        ]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </TableCell>
                      <TableCell>{item.username ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={selected != null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {KIND_LABELS[selected.kind]} · {selected.supplyName}
                </DialogTitle>
              </DialogHeader>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-muted-foreground">Date</dt>
                  <dd className="font-medium">{formatDate(selected.date)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Quantity</dt>
                  <dd className="font-medium">{selected.quantity}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Location</dt>
                  <dd className="font-medium">
                    {selected.locationName ?? "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">User</dt>
                  <dd className="font-medium">{selected.username ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Vendor</dt>
                  <dd className="font-medium">{selected.vendorName ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">PO #</dt>
                  <dd className="font-medium">
                    {selected.externalPoNumber ?? "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Status</dt>
                  <dd className="font-medium capitalize">
                    {selected.status
                      ? selected.status.toLowerCase().replace(/_/g, " ")
                      : "—"}
                  </dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-muted-foreground">Notes</dt>
                  <dd className="font-medium break-words">
                    {selected.notes ?? "—"}
                  </dd>
                </div>
              </dl>
              <Button asChild variant="outline">
                <a
                  href={`${suppliesPath}?q=${encodeURIComponent(selected.supplyName)}`}
                >
                  View supply
                </a>
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
