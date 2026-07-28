import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Header } from "@/components/layout/header";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="relative flex min-h-screen max-w-[100vw] flex-col overflow-x-clip">
      <Header />
      <main id="main-content" className="min-w-0 flex-1">
        <div className="container min-w-0">{children}</div>
      </main>
    </div>
  );
}
