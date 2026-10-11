import { AppHeader } from "@/components/app-header";
import { SectionNav } from "@/components/section-nav";
import { requireCompany } from "@/lib/auth";

const NAV_ITEMS = [
  { href: "/provider", label: "Resumen" },
  { href: "/provider/deletions", label: "Borrado de grabaciones" },
  { href: "/provider/relations", label: "Relaciones" },
  { href: "/provider/settings", label: "Ajustes" },
];

export default async function ProviderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireCompany("PROVIDER");

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
