import { NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  isKioskAuthenticated,
  getKioskUserId,
  getKioskSite,
} from "@/lib/kiosk";
import { kioskCheckoutSchema } from "@/lib/validation/stock-movement";
import { stockMovementService } from "@/server/services/stock-movement.service";

export async function POST(request: Request) {
  if (!(await isKioskAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const site = await getKioskSite();
  if (!site) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  let data;
  try {
    data = kioskCheckoutSchema.parse(json);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const kioskUserId = await getKioskUserId(site.id);

  const result = await stockMovementService.consumeBulk(
    kioskUserId,
    site.id,
    {
      items: data.items,
      locationId: data.locationId,
      notes: data.notes,
    },
    { auditPrefix: "Kiosk consumed" }
  );

  if (!result.success) {
    if (result.missing && result.missing.length > 0) {
      return NextResponse.json(
        { error: result.error, missing: result.missing },
        { status: 404 }
      );
    }
    if (result.insufficient && result.insufficient.length > 0) {
      return NextResponse.json(
        { error: result.error, insufficient: result.insufficient },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    items: result.data.items.map((item) => ({
      id: item.id,
      name: item.name,
      quantity: data.items
        .filter((i) => i.supplyId === item.id)
        .reduce((sum, i) => sum + i.quantity, 0),
    })),
  });
}
