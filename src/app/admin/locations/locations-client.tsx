"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  LocationDialog,
  type LocationFormValues,
} from "@/components/admin/location-dialog";
import { toast } from "sonner";

interface Location {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
  _count: { stockLevels: number };
}

interface LocationsClientProps {
  initialLocations: Location[];
}

export function LocationsClient({ initialLocations }: LocationsClientProps) {
  const [locations, setLocations] = useState(initialLocations);

  const handleCreate = async (data: LocationFormValues) => {
    try {
      const response = await fetch("/api/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          typeof error.error === "string"
            ? error.error
            : "Failed to create location"
        );
      }

      const newLocation = await response.json();
      setLocations((prev) =>
        [
          ...prev,
          {
            id: newLocation.id,
            name: newLocation.name,
            type: newLocation.type,
            isActive: newLocation.isActive,
            _count: { stockLevels: 0 },
          },
        ].sort((a, b) => a.name.localeCompare(b.name))
      );
      toast.success("Location created successfully");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create location"
      );
      throw error;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Locations</h2>
          <p className="text-muted-foreground">
            Inventory locations across your organization
          </p>
        </div>
        <LocationDialog onSubmit={handleCreate} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>All Locations</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Stock Items</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {locations.map((loc) => (
                <TableRow key={loc.id}>
                  <TableCell className="font-medium">{loc.name}</TableCell>
                  <TableCell>{loc.type}</TableCell>
                  <TableCell>{loc._count.stockLevels}</TableCell>
                  <TableCell>{loc.isActive ? "Active" : "Inactive"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
