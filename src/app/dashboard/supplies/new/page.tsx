import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SupplyForm } from "@/components/supplies/supply-form";

export default async function NewSupplyPage() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "ADMIN") {
    redirect("/dashboard/supplies");
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">New Supply</h2>
      </div>
      <div className="grid gap-4 grid-cols-1">
        <div className="p-6 border rounded-lg">
          <SupplyForm />
        </div>
      </div>
    </div>
  );
}
