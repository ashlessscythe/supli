import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const supplies = await prisma.supply.findMany({
    orderBy: {
      quantity: "asc",
    },
  });

  const lowStockSupplies = supplies.filter(
    (supply) => supply.quantity <= supply.minimumThreshold
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-500">Total Supplies</p>
            <p className="text-2xl font-bold">{supplies.length}</p>
          </div>
        </div>
        <div className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-500">Low Stock Items</p>
            <p className="text-2xl font-bold">{lowStockSupplies.length}</p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border shadow-sm">
        <div className="p-4">
          <h2 className="text-lg font-semibold">Supply Inventory</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">
                  Name
                </th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">
                  Description
                </th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">
                  Quantity
                </th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {supplies.map((supply) => (
                <tr key={supply.id} className="border-b">
                  <td className="px-4 py-2">{supply.name}</td>
                  <td className="px-4 py-2">{supply.description}</td>
                  <td className="px-4 py-2">{supply.quantity}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                        supply.quantity <= supply.minimumThreshold
                          ? "bg-red-100 text-red-700"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {supply.quantity <= supply.minimumThreshold
                        ? "Low Stock"
                        : "In Stock"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
