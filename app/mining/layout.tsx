import { AppHeader } from "@/components/app-header";
import { SectionNav } from "@/components/section-nav";
import { requireCompany } from "@/lib/auth";

const NAV_ITEMS = [
  { href: "/mining", label: "Resumen" },
  { href: "/mining/shifts", label: "Turnos" },
  { href: "/mining/videos", label: "Grabaciones" },
  { href: "/mining/members", label: "Conductores" },
  { href: "/mining/providers", label: "Proveedoras" },
  { href: "/mining/claims", label: "Reclamos" },
  { href: "/mining/access", label: "Accesos" },
  { href: "/mining/settings", label: "Ajustes" },
];

export default async function MiningLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireCompany("MINING");

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
