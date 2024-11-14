import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SuppliesTable } from "@/components/supplies/supplies-table";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";

async function getSupplies() {
  const supplies = await prisma.supply.findMany({
    orderBy: {
      name: "asc",
    },
  });

  return supplies;
}

export default async function AdminSuppliesPage() {
  const supplies = await getSupplies();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Supply Management
          </h2>
          <p className="text-muted-foreground">
            View and manage all supplies in the system
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/supplies/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Supply
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Supplies</CardTitle>
        </CardHeader>
        <CardContent>
          <SuppliesTable data={supplies} isAdmin={true} />
        </CardContent>
      </Card>
    </div>
  );
}
