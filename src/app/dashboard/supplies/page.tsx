import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getSupplies } from "@/lib/actions/supply";
import { SuppliesTable } from "@/components/supplies/supplies-table";
import { SupplyDialog } from "@/components/supplies/supply-dialog";

export default async function SuppliesPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const result = await getSupplies();
  const supplies = result.success ? result.data : [];
  const initialSearch = searchParams.q ?? "";

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Supplies</h2>
        {session.user.role === "ADMIN" && <SupplyDialog isAdmin />}
      </div>
      <Suspense fallback={<div>Loading...</div>}>
        <SuppliesTable
          data={supplies || []}
          isAdmin={session.user.role === "ADMIN"}
          initialSearch={initialSearch}
        />
      </Suspense>
    </div>
  );
}
