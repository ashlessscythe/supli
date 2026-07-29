"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatBarcode } from "@/lib/barcode";
import { cn } from "@/lib/utils";
import { useFormatDate } from "@/components/providers/site-timezone-provider";
import { useSupplyDetailViewMode } from "@/hooks/use-supply-detail-view-mode";
import { SupplyQrDialog } from "@/components/supplies/supply-qr-dialog";
import { VendorContactActions } from "@/components/vendors/vendor-contact-actions";
import { isVendorEmail } from "@/lib/vendor-contact";
import { LayoutList, Loader2, ScrollText } from "lucide-react";

export interface SupplyDetails {
  id: string;
  name: string;
  description: string;
  quantity: number;
  minimumThreshold: number;
  barcode: string | null;
  internalSku: string | null;
  createdAt: string;
  updatedAt: string;
  itemType: { name: string; slug: string } | null;
  stockLevels: {
    locationName: string;
    quantity: number;
    minimumThreshold: number;
  }[];
  vendors: {
    id: string;
    name: string;
    contact: string | null;
    website: string | null;
    vendorSku: string | null;
    internalSku: string | null;
    isPreferred: boolean;
    leadTimeDays: number | null;
    moq: number | null;
    cost: number | null;
  }[];
  lastReceipt: {
    id: string;
    createdAt: string;
    quantity: number;
    locationName: string;
    notes: string | null;
    externalPoNumber: string | null;
    username: string;
  } | null;
  recentMovements: {
    id: string;
    type: string;
    quantity: number;
    createdAt: string;
    locationName: string;
    notes: string | null;
    externalPoNumber: string | null;
    username: string;
  }[];
  recentRequests: {
    id: string;
    quantity: number;
    status: string;
    username: string;
    createdAt: string;
  }[];
  openReorders: {
    id: string;
    quantity: number;
    status: string;
    vendorName: string | null;
    orderedAt: string;
    externalPoNumber: string | null;
  }[];
}

interface SupplyDetailDialogProps {
  supplyId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const movementTypeLabels: Record<string, string> = {
  RECEIVE: "Received",
  CONSUME: "Consumed",
  ADJUST: "Adjusted",
  TRANSFER: "Transferred",
};

const requestStatusStyles: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  APPROVED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  DENIED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

function DetailRow({
  label,
  value,
  className,
}: {
  label: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold">{title}</h3>
      {children}
    </section>
  );
}

function ViewModeToggle({
  viewMode,
  onViewModeChange,
}: {
  viewMode: "scroll" | "tabs";
  onViewModeChange: (mode: "scroll" | "tabs") => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-0.5 rounded-md border p-0.5">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn(
          "h-7 w-7",
          viewMode === "scroll" && "bg-accent text-accent-foreground"
        )}
        aria-pressed={viewMode === "scroll"}
        onClick={() => onViewModeChange("scroll")}
      >
        <ScrollText className="h-4 w-4" />
        <span className="sr-only">Scroll view</span>
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn(
          "h-7 w-7",
          viewMode === "tabs" && "bg-accent text-accent-foreground"
        )}
        aria-pressed={viewMode === "tabs"}
        onClick={() => onViewModeChange("tabs")}
      >
        <LayoutList className="h-4 w-4" />
        <span className="sr-only">Tabbed view</span>
      </Button>
    </div>
  );
}

function OverviewContent({
  details,
  isLowStock,
  preferredVendor,
}: {
  details: SupplyDetails;
  isLowStock: boolean;
  preferredVendor: SupplyDetails["vendors"][number] | undefined;
}) {
  const formatDate = useFormatDate();
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <DetailRow
          label="On hand"
          value={
            <span className={cn(isLowStock && "text-red-500")}>
              {details.quantity}
            </span>
          }
        />
        <DetailRow label="Min. threshold" value={details.minimumThreshold} />
        <DetailRow label="Internal SKU" value={details.internalSku ?? "—"} />
        <DetailRow
          label="Barcode"
          value={
            details.barcode ? (
              <span className="font-mono text-xs">
                {formatBarcode(details.barcode)}
              </span>
            ) : (
              "—"
            )
          }
        />
      </div>

      <div>
        <p className="mb-1.5 text-xs text-muted-foreground">QR code</p>
        <SupplyQrDialog barcode={details.barcode} supplyName={details.name} />
      </div>

      {details.itemType && (
        <DetailRow label="Item type" value={details.itemType.name} />
      )}

      {!details.lastReceipt && preferredVendor?.leadTimeDays != null && (
        <DetailRow
          label="Expected lead time"
          value={`${preferredVendor.leadTimeDays} days (${preferredVendor.name})`}
        />
      )}

      <p className="text-xs text-muted-foreground">
        Added {formatDate(details.createdAt)} · Updated{" "}
        {formatDate(details.updatedAt)}
      </p>
    </div>
  );
}

function StockLevelsContent({ details }: { details: SupplyDetails }) {
  return (
    <ul className="divide-y rounded-md border text-sm">
      {details.stockLevels.map((sl) => {
        const low = sl.quantity <= sl.minimumThreshold;
        return (
          <li
            key={sl.locationName}
            className="flex items-center justify-between px-3 py-2"
          >
            <span>{sl.locationName}</span>
            <span
              className={cn(
                "tabular-nums font-medium",
                low && "text-red-500"
              )}
            >
              {sl.quantity}
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                / min {sl.minimumThreshold}
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function VendorsContent({ details }: { details: SupplyDetails }) {
  return (
    <ul className="divide-y rounded-md border text-sm">
      {details.vendors.map((vendor) => (
        <li key={vendor.id} className="space-y-1 px-3 py-2.5">
          <div className="flex items-center gap-2">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              <span className="font-medium">{vendor.name}</span>
              {vendor.isPreferred && (
                <span className="rounded bg-primary/15 px-1.5 py-0.5 text-xs text-primary">
                  Preferred
                </span>
              )}
            </div>
            <VendorContactActions
              website={vendor.website}
              contact={vendor.contact}
            />
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {vendor.vendorSku && <span>Vendor SKU: {vendor.vendorSku}</span>}
            {vendor.leadTimeDays != null && (
              <span>Lead time: {vendor.leadTimeDays} days</span>
            )}
            {vendor.moq != null && <span>MOQ: {vendor.moq}</span>}
            {vendor.cost != null && <span>${vendor.cost.toFixed(2)}</span>}
            {vendor.contact &&
              (isVendorEmail(vendor.contact) ? (
                <span>
                  Contact:{" "}
                  <a
                    href={`mailto:${vendor.contact.trim()}`}
                    className="text-primary hover:underline"
                  >
                    {vendor.contact}
                  </a>
                </span>
              ) : (
                <span>Contact: {vendor.contact}</span>
              ))}
          </div>
        </li>
      ))}
    </ul>
  );
}

function LastReceiptContent({ details }: { details: SupplyDetails }) {
  const formatDate = useFormatDate();
  if (!details.lastReceipt) return null;

  return (
    <div className="rounded-md border bg-muted/30 px-3 py-2.5 text-sm">
      <p className="font-medium">
        +{details.lastReceipt.quantity} at {details.lastReceipt.locationName}
      </p>
      <p className="text-xs text-muted-foreground">
        {formatDate(details.lastReceipt.createdAt)} ·{" "}
        {details.lastReceipt.username}
        {details.lastReceipt.externalPoNumber &&
          ` · PO ${details.lastReceipt.externalPoNumber}`}
      </p>
      {details.lastReceipt.notes && (
        <p className="mt-1 text-xs text-muted-foreground">
          {details.lastReceipt.notes}
        </p>
      )}
    </div>
  );
}

function OpenOrdersContent({ details }: { details: SupplyDetails }) {
  const formatDate = useFormatDate();
  return (
    <ul className="divide-y rounded-md border text-sm">
      {details.openReorders.map((order) => (
        <li
          key={order.id}
          className="flex items-center justify-between px-3 py-2"
        >
          <div>
            <p className="font-medium">
              {order.quantity} units
              {order.vendorName && ` from ${order.vendorName}`}
            </p>
            <p className="text-xs text-muted-foreground">
              Ordered {formatDate(order.orderedAt)}
              {order.externalPoNumber && ` · PO ${order.externalPoNumber}`}
            </p>
          </div>
          <span className="text-xs capitalize text-muted-foreground">
            {order.status.replace(/_/g, " ").toLowerCase()}
          </span>
        </li>
      ))}
    </ul>
  );
}

function RecentActivityContent({ details }: { details: SupplyDetails }) {
  const formatDate = useFormatDate();
  return (
    <ul className="divide-y rounded-md border text-sm">
      {details.recentMovements.map((movement) => (
        <li key={movement.id} className="px-3 py-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-medium">
                {movementTypeLabels[movement.type] ?? movement.type}{" "}
                {movement.quantity}
              </p>
              <p className="text-xs text-muted-foreground">
                {movement.locationName} · {formatDate(movement.createdAt)} ·{" "}
                {movement.username}
              </p>
              {movement.notes && (
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {movement.notes}
                </p>
              )}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function RecentRequestsContent({ details }: { details: SupplyDetails }) {
  const formatDate = useFormatDate();
  return (
    <ul className="divide-y rounded-md border text-sm">
      {details.recentRequests.map((request) => (
        <li
          key={request.id}
          className="flex items-center justify-between px-3 py-2"
        >
          <div>
            <p className="font-medium">
              {request.quantity} units · {request.username}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatDate(request.createdAt)}
            </p>
          </div>
          <span
            className={cn(
              "rounded px-1.5 py-0.5 text-xs font-medium capitalize",
              requestStatusStyles[request.status] ??
                "bg-muted text-muted-foreground"
            )}
          >
            {request.status.toLowerCase()}
          </span>
        </li>
      ))}
    </ul>
  );
}

function ScrollView({
  details,
  isLowStock,
  preferredVendor,
}: {
  details: SupplyDetails;
  isLowStock: boolean;
  preferredVendor: SupplyDetails["vendors"][number] | undefined;
}) {
  return (
    <div className="max-h-[calc(90vh-8rem)] space-y-5 overflow-y-auto pr-1">
      <OverviewContent
        details={details}
        isLowStock={isLowStock}
        preferredVendor={preferredVendor}
      />

      {details.stockLevels.length > 0 && (
        <Section title="Stock by location">
          <StockLevelsContent details={details} />
        </Section>
      )}

      {details.vendors.length > 0 && (
        <Section title="Vendors">
          <VendorsContent details={details} />
        </Section>
      )}

      {details.lastReceipt && (
        <Section title="Last receipt">
          <LastReceiptContent details={details} />
        </Section>
      )}

      {details.openReorders.length > 0 && (
        <Section title="Open orders">
          <OpenOrdersContent details={details} />
        </Section>
      )}

      {details.recentMovements.length > 0 && (
        <Section title="Recent activity">
          <RecentActivityContent details={details} />
        </Section>
      )}

      {details.recentRequests.length > 0 && (
        <Section title="Recent requests">
          <RecentRequestsContent details={details} />
        </Section>
      )}
    </div>
  );
}

function TabbedView({
  details,
  isLowStock,
  preferredVendor,
  activeTab,
  onActiveTabChange,
}: {
  details: SupplyDetails;
  isLowStock: boolean;
  preferredVendor: SupplyDetails["vendors"][number] | undefined;
  activeTab: string;
  onActiveTabChange: (tab: string) => void;
}) {
  return (
    <Tabs
      value={activeTab}
      onValueChange={onActiveTabChange}
      className="min-h-0"
    >
      <TabsList className="h-auto w-full flex-wrap justify-start">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        {details.stockLevels.length > 0 && (
          <TabsTrigger value="stock">Stock by location</TabsTrigger>
        )}
        {details.vendors.length > 0 && (
          <TabsTrigger value="vendors">Vendors</TabsTrigger>
        )}
        {details.lastReceipt && (
          <TabsTrigger value="receipt">Last receipt</TabsTrigger>
        )}
        {details.openReorders.length > 0 && (
          <TabsTrigger value="orders">Open orders</TabsTrigger>
        )}
        {details.recentMovements.length > 0 && (
          <TabsTrigger value="activity">Recent activity</TabsTrigger>
        )}
        {details.recentRequests.length > 0 && (
          <TabsTrigger value="requests">Recent requests</TabsTrigger>
        )}
      </TabsList>

      <TabsContent
        value="overview"
        className="max-h-[calc(90vh-10rem)] overflow-y-auto pr-1"
      >
        <OverviewContent
          details={details}
          isLowStock={isLowStock}
          preferredVendor={preferredVendor}
        />
      </TabsContent>

      {details.stockLevels.length > 0 && (
        <TabsContent
          value="stock"
          className="max-h-[calc(90vh-10rem)] overflow-y-auto pr-1"
        >
          <StockLevelsContent details={details} />
        </TabsContent>
      )}

      {details.vendors.length > 0 && (
        <TabsContent
          value="vendors"
          className="max-h-[calc(90vh-10rem)] overflow-y-auto pr-1"
        >
          <VendorsContent details={details} />
        </TabsContent>
      )}

      {details.lastReceipt && (
        <TabsContent
          value="receipt"
          className="max-h-[calc(90vh-10rem)] overflow-y-auto pr-1"
        >
          <LastReceiptContent details={details} />
        </TabsContent>
      )}

      {details.openReorders.length > 0 && (
        <TabsContent
          value="orders"
          className="max-h-[calc(90vh-10rem)] overflow-y-auto pr-1"
        >
          <OpenOrdersContent details={details} />
        </TabsContent>
      )}

      {details.recentMovements.length > 0 && (
        <TabsContent
          value="activity"
          className="max-h-[calc(90vh-10rem)] overflow-y-auto pr-1"
        >
          <RecentActivityContent details={details} />
        </TabsContent>
      )}

      {details.recentRequests.length > 0 && (
        <TabsContent
          value="requests"
          className="max-h-[calc(90vh-10rem)] overflow-y-auto pr-1"
        >
          <RecentRequestsContent details={details} />
        </TabsContent>
      )}
    </Tabs>
  );
}

export function SupplyDetailDialog({
  supplyId,
  open,
  onOpenChange,
}: SupplyDetailDialogProps) {
  const [details, setDetails] = useState<SupplyDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const { viewMode, setViewMode } = useSupplyDetailViewMode();

  useEffect(() => {
    if (!open || !supplyId) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setDetails(null);
    setActiveTab("overview");

    fetch(`/api/supplies/${supplyId}/details`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? "Failed to load supply details");
        }
        return res.json() as Promise<SupplyDetails>;
      })
      .then((data) => {
        if (!cancelled) setDetails(data);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, supplyId]);

  const isLowStock =
    details != null && details.quantity <= details.minimumThreshold;

  const preferredVendor = details?.vendors.find((v) => v.isPreferred);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-hidden">
        {loading && (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading supply details…
          </div>
        )}

        {error && (
          <div className="py-8 text-center text-sm text-destructive">
            {error}
          </div>
        )}

        {!loading && !error && details && (
          <>
            <DialogHeader>
              <div className="flex items-start justify-between gap-2 pr-6">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <DialogTitle className="text-left">{details.name}</DialogTitle>
                  {isLowStock && (
                    <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
                      Low stock
                    </span>
                  )}
                </div>
                <ViewModeToggle viewMode={viewMode} onViewModeChange={setViewMode} />
              </div>
              {details.description && (
                <DialogDescription className="text-left">
                  {details.description}
                </DialogDescription>
              )}
            </DialogHeader>

            {viewMode === "scroll" ? (
              <ScrollView
                details={details}
                isLowStock={isLowStock}
                preferredVendor={preferredVendor}
              />
            ) : (
              <TabbedView
                details={details}
                isLowStock={isLowStock}
                preferredVendor={preferredVendor}
                activeTab={activeTab}
                onActiveTabChange={setActiveTab}
              />
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
