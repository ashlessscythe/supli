"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useSupplies } from "@/hooks/use-supplies";
import { SupplyDialog } from "@/components/supplies/supply-dialog";
import { formatBarcode } from "@/lib/barcode";
import { cn } from "@/lib/utils";
import { MoreHorizontal, Edit, Trash } from "lucide-react";

interface Supply {
  id: string;
  name: string;
  description: string;
  quantity: number;
  minimumThreshold: number;
  barcode?: string | null;
  internalSku?: string | null;
}

interface SuppliesTableProps {
  data: Supply[];
  isAdmin: boolean;
}

export function SuppliesTable({ data, isAdmin }: SuppliesTableProps) {
  const { handleUpdateQuantity, handleDeleteSupply, isLoading } = useSupplies();
  const [quantities, setQuantities] = useState<Record<string, number | null>>(
    {}
  );
  const [editingSupply, setEditingSupply] = useState<Supply | null>(null);

  const handleQuantityChange = (id: string, value: string) => {
    const numValue = value === "" ? null : parseInt(value);
    setQuantities((prev) => ({ ...prev, [id]: numValue }));
  };

  const updateQuantity = async (id: string) => {
    const quantity = quantities[id];
    if (quantity !== null && quantity !== undefined) {
      await handleUpdateQuantity(id, quantity);
      setQuantities((prev) => ({ ...prev, [id]: null }));
    }
  };

  const isUpdateDisabled = (id: string) =>
    isLoading || quantities[id] === null || quantities[id] === undefined;

  const isLowStock = (supply: Supply) =>
    supply.quantity <= supply.minimumThreshold;

  const ActionsMenu = ({ supply }: { supply: Supply }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            setEditingSupply(supply);
          }}
        >
          <Edit className="mr-2 h-4 w-4" />
          Edit
        </DropdownMenuItem>
        {isAdmin && (
          <DropdownMenuItem
            onClick={() => handleDeleteSupply(supply.id)}
            className="text-red-600"
            disabled={isLoading}
          >
            <Trash className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <>
      {/* Desktop / tablet: table */}
      <div className="hidden rounded-md border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Barcode</TableHead>
              <TableHead className="w-[100px] text-right">Quantity</TableHead>
              <TableHead className="w-[100px] text-right">
                Min. Threshold
              </TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((supply) => (
              <TableRow key={supply.id}>
                <TableCell className="font-medium">{supply.name}</TableCell>
                <TableCell>{supply.description}</TableCell>
                <TableCell className="font-mono text-sm text-muted-foreground">
                  {supply.barcode ? formatBarcode(supply.barcode) : "—"}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <span className={cn(isLowStock(supply) && "text-red-500")}>
                      {supply.quantity}
                    </span>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={quantities[supply.id] ?? ""}
                        onChange={(e) =>
                          handleQuantityChange(supply.id, e.target.value)
                        }
                        className="w-20"
                        min={0}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateQuantity(supply.id)}
                        disabled={isUpdateDisabled(supply.id)}
                      >
                        Update
                      </Button>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  {supply.minimumThreshold}
                </TableCell>
                <TableCell>
                  <ActionsMenu supply={supply} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile: cards */}
      <div className="space-y-3 md:hidden">
        {data.map((supply) => (
          <div
            key={supply.id}
            className="rounded-md border p-4 space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium break-words">{supply.name}</p>
                {supply.description && (
                  <p className="text-sm text-muted-foreground break-words">
                    {supply.description}
                  </p>
                )}
              </div>
              <ActionsMenu supply={supply} />
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div>
                <p className="text-muted-foreground">Quantity</p>
                <p
                  className={cn(
                    "font-medium",
                    isLowStock(supply) && "text-red-500"
                  )}
                >
                  {supply.quantity}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Min. Threshold</p>
                <p className="font-medium">{supply.minimumThreshold}</p>
              </div>
              <div className="col-span-2">
                <p className="text-muted-foreground">Barcode</p>
                <p className="font-mono text-sm break-all">
                  {supply.barcode ? formatBarcode(supply.barcode) : "—"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Input
                type="number"
                placeholder="New qty"
                value={quantities[supply.id] ?? ""}
                onChange={(e) =>
                  handleQuantityChange(supply.id, e.target.value)
                }
                className="flex-1"
                min={0}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateQuantity(supply.id)}
                disabled={isUpdateDisabled(supply.id)}
              >
                Update
              </Button>
            </div>
          </div>
        ))}
      </div>

      {editingSupply && (
        <SupplyDialog
          key={editingSupply.id}
          initialData={editingSupply}
          isAdmin={isAdmin}
          trigger={null}
          open
          onOpenChange={(open) => {
            if (!open) setEditingSupply(null);
          }}
        />
      )}
    </>
  );
}
