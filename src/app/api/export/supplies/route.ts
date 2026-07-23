import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { formatBarcode } from "@/lib/barcode";

export async function GET() {
  try {
    const ctx = await requireAdmin();

    const supplies = await prisma.supply.findMany({
      where: { siteId: ctx.siteId },
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

    const header =
      "id,name,description,quantity,minimumThreshold,barcode,internalSku";
    const rows = supplies.map((s) =>
      [
        s.id,
        `"${s.name.replace(/"/g, '""')}"`,
        `"${s.description.replace(/"/g, '""')}"`,
        s.quantity,
        s.minimumThreshold,
        s.barcode ? formatBarcode(s.barcode) : "",
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
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
