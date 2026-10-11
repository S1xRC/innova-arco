import { AppHeader } from "@/components/app-header";
import { SectionNav } from "@/components/section-nav";
import { requireRole } from "@/lib/auth";

const NAV_ITEMS = [
  { href: "/driver", label: "Mis grabaciones" },
  { href: "/driver/policies", label: "Uso de datos" },
];

export default async function DriverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireRole(["DRIVER"]);

  return (
    <div className="flex min-h-svh flex-col">
      <AppHeader profile={profile} />
      <SectionNav items={NAV_ITEMS} />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  );
}

