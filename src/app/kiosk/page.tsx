import { redirect } from "next/navigation";
import { isKioskAuthenticated } from "@/lib/kiosk";
import { KioskClient } from "./kiosk-client";

export default async function KioskPage() {
  const authenticated = await isKioskAuthenticated();

  if (!authenticated) {
    redirect("/kiosk/login");
  }

  return <KioskClient />;
}
