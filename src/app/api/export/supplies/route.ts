import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supplies = await prisma.supply.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      description: true,
      quantity: true,
      minimumThreshold: true,
      barcode: true,
      internalSku: true,
    },
  });

  const header = "id,name,description,quantity,minimumThreshold,barcode,internalSku";
  const rows = supplies.map((s) =>
    [
      s.id,
      `"${s.name.replace(/"/g, '""')}"`,
      `"${s.description.replace(/"/g, '""')}"`,
      s.quantity,
      s.minimumThreshold,
      s.barcode ?? "",
      s.internalSku ?? "",
    ].join(",")
  );

  const csv = [header, ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="supplies.csv"',
    },
  });
}
