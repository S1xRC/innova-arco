import { AppHeader } from "@/components/app-header";
import { requirePlatformAdmin } from "@/lib/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requirePlatformAdmin();

  return (
    <div className="flex min-h-svh flex-col">
      <AppHeader profile={profile} />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  );
}
