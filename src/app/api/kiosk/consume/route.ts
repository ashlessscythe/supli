import { NextResponse } from "next/server";
import { stockMovementService } from "@/server/services/stock-movement.service";
import { prisma } from "@/lib/prisma";
import { isKioskAuthenticated, getKioskUserId } from "@/lib/kiosk";

export async function POST(request: Request) {
  if (!(await isKioskAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const kioskUserId = await getKioskUserId();

  const json = await request.json();
  const result = await stockMovementService.consume(kioskUserId, json);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const supply = await prisma.supply.findUnique({
    where: { id: result.data.id },
    select: { name: true },
  });

  return NextResponse.json({ ...result.data, name: supply?.name });
}
