import { redirect } from "next/navigation";

export default function DashboardRequestsPage() {
  redirect("/dashboard/inbound");
}
