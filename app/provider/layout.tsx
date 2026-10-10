import { AppHeader } from "@/components/app-header";
import { SectionNav } from "@/components/section-nav";
import { requireRole } from "@/lib/auth";

const NAV_ITEMS = [
  { href: "/provider", label: "Resumen" },
  { href: "/provider/upload", label: "Subir metadatos" },
  { href: "/provider/claims", label: "Bandeja de reclamos" },
];

export default async function ProviderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireRole(["PROVIDER"]);

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
