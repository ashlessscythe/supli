import {
  Package,
  ClipboardList,
  ScanLine,
  MapPin,
  BarChart3,
  Shield,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Reveal } from "@/components/landing/reveal";

const features = [
  {
    icon: Package,
    title: "Inventory control",
    description:
      "CRUD for supplies with barcode and SKU support, minimum thresholds, inline quantity updates, and fast search.",
  },
  {
    icon: ClipboardList,
    title: "Request workflow",
    description:
      "Staff submit supply requests; admins approve or deny with full status tracking from pending to fulfilled.",
  },
  {
    icon: ScanLine,
    title: "Floor kiosk",
    description:
      "PIN-gated barcode scanning for walk-up checkout — scan, enter quantity, and record stock consumption on the floor.",
  },
  {
    icon: MapPin,
    title: "Locations & vendors",
    description:
      "Manage warehouses, cages, and tool rooms with per-location stock. Vendor catalog with cost, lead time, and MOQ.",
  },
  {
    icon: BarChart3,
    title: "Dashboards & alerts",
    description:
      "Admin overview charts, depletion forecasting signals, and an in-app notification bell for low stock and request updates.",
  },
  {
    icon: Shield,
    title: "Enterprise identity",
    description:
      "Role-based access for admins and staff, self-registration with approval, invites, password reset, audit log, and CSV export.",
  },
];

export function LandingFeatures() {
  return (
    <section id="features" className="border-t bg-muted/30 py-24">
      <div className="container">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Everything your ops team needs
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              From back-office inventory to front-line consumption — one platform
              for the full supply lifecycle.
            </p>
          </div>
        </Reveal>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, idx) => (
            <Reveal key={feature.title} delayMs={idx * 60}>
              <Card className="border-border/60 bg-card/80 backdrop-blur-sm transition-transform duration-300 hover:-translate-y-0.5 hover:shadow-md">
                <CardHeader>
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <feature.icon className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
