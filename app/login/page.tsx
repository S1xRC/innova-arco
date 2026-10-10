import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SignInButton } from "@/components/sign-in-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSessionProfile } from "@/lib/auth";
import { APP_NAME, roleHomePath } from "@/lib/constants";

export const metadata = { title: "Iniciar sesión" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const profile = await getSessionProfile();

  if (profile) {
    if (profile.role === "DRIVER" && !profile.companyId) {
      redirect("/onboarding");
    }
    redirect(roleHomePath(profile.role));
  }

  return (
    <div className="flex min-h-svh flex-col">
      <header className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <ShieldCheck className="text-primary size-5" />
          {APP_NAME}
        </Link>
        <ThemeToggle />
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-xl">Acceso a la plataforma</CardTitle>
            <CardDescription>
              Ingresa con tu cuenta de Google. El sistema te llevará
              automáticamente al panel que corresponde a tu rol.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error ? (
              <Alert variant="destructive">
                <AlertTitle>No pudimos iniciar tu sesión</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            <SignInButton label="Continuar con Google" />

            <p className="text-muted-foreground text-xs">
              Al continuar aceptas el tratamiento de tus datos para la gestión
              de solicitudes de derechos ARCO.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
