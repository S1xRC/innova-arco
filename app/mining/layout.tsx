import { AppHeader } from "@/components/app-header";
import { requireRole } from "@/lib/auth";

export default async function MiningLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireRole(["MINING"]);

  return (
    <div className="flex min-h-svh flex-col">
      <AppHeader profile={profile} />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  );
}
