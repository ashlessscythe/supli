import { NextResponse } from "next/server";
import { isKioskAuthenticated, getKioskSite } from "@/lib/kiosk";
import { normalizeBarcode } from "@/lib/barcode";
import { supplyRepository } from "@/server/repositories/supply.repository";

export async function GET(request: Request) {
  if (!(await isKioskAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const site = await getKioskSite();
  if (!site) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const barcode = normalizeBarcode(
    new URL(request.url).searchParams.get("barcode")
  );
  if (!barcode) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  const supply = await supplyRepository.findByBarcode(barcode, site.id);
  if (!supply) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  return NextResponse.json({ name: supply.name, barcode: supply.barcode });
}
