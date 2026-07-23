import { redirect } from "next/navigation";
import { getKioskSite, isKioskAuthenticated } from "@/lib/kiosk";
import { KioskClient } from "./kiosk-client";

export default async function KioskPage() {
  const authenticated = await isKioskAuthenticated();

  if (!authenticated) {
    redirect("/kiosk/login");
  }

  const site = await getKioskSite();
  if (!site) {
    redirect("/kiosk/login");
  }

  return <KioskClient siteName={site.name} />;
}
