import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getSupplies } from "@/lib/actions/supply";
import { SuppliesTable } from "@/components/supplies/supplies-table";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";

export default async function SuppliesPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const { data: supplies, error } = await getSupplies();

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Supplies</h2>
        {session.user.role === "ADMIN" && (
          <Link href="/dashboard/supplies/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Supply
            </Button>
          </Link>
        )}
      </div>
      <Suspense fallback={<div>Loading...</div>}>
        <SuppliesTable
          data={supplies || []}
          isAdmin={session.user.role === "ADMIN"}
        />
      </Suspense>
    </div>
  );
}
