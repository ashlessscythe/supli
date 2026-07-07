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
      // Clear the input after successful update
      setQuantities((prev) => ({ ...prev, [id]: null }));
    }
  };

  return (
    <div className="rounded-md border">
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
                {supply.barcode ?? "—"}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <span
                    className={
                      supply.quantity <= supply.minimumThreshold
                        ? "text-red-500"
                        : ""
                    }
                  >
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
                        disabled={
                          isLoading ||
                          quantities[supply.id] === null ||
                          quantities[supply.id] === undefined
                        }
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
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

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
    </div>
  );
}
