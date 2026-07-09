import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Reveal } from "@/components/landing/reveal";

const screenshots = [
  {
    src: "/landing/dashboard.png",
    alt: "Admin dashboard with stats, request trends, and low-stock visibility",
    title: "Admin dashboard",
    description: "Stats, trends, and low-stock visibility at a glance.",
  },
  {
    src: "/landing/supply_details_popup.png",
    alt: "Supply detail modal with stock levels, vendors, lead time, and receipt history",
    title: "Supply details",
    description: "Click any item for vendors, lead times, and receipt history.",
  },
  {
    src: "/landing/request_mobile.png",
    alt: "Supply request workflow on mobile with pending and approved statuses",
    title: "Supply requests",
    description: "Staff submit; admins approve or deny.",
  },
  {
    src: "/landing/kiosk.png",
    alt: "Touch-friendly kiosk mode for barcode scan and stock consumption",
    title: "Kiosk mode",
    description: "Scan → quantity → complete on the floor.",
  },
  {
    src: "/landing/notifications.png",
    alt: "In-app notification bell with unread badge for alerts",
    title: "Notifications",
    description: "Low stock, requests, and registration alerts.",
  },
  {
    src: "/landing/audit_log.png",
    alt: "Audit log table listing system actions, users, and timestamps",
    title: "Audit log",
    description: "Full activity trail — receipts, requests, and consumption.",
  },
];

export function LandingShowcase() {
  return (
    <section className="py-24">
      <div className="container">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              See it in action
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              How teams manage supplies, requests, and floor consumption every
              day.
            </p>
          </div>
        </Reveal>

        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {screenshots.map((shot, idx) => (
            <Reveal key={shot.title} delayMs={idx * 70}>
              <Card className="group overflow-hidden border-border/60 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                <CardContent className="p-0">
                  <div className="relative aspect-[16/10] w-full overflow-hidden border-b bg-muted">
                    <Image
                      src={shot.src}
                      alt={shot.alt}
                      fill
                      className="object-cover object-top transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  </div>
                  <div className="p-5">
                    <h3 className="font-semibold">{shot.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {shot.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
