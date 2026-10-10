import { ArrowRight, Camera, ShieldCheck, Users } from "lucide-react";
import Link from "next/link";

import { SignInButton } from "@/components/sign-in-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSessionProfile } from "@/lib/auth";
import { APP_DESCRIPTION, APP_NAME, roleHomePath } from "@/lib/constants";

const ROLES = [
  {
    icon: Camera,
    title: "Proveedor de cámaras",
    description:
      "Sube los metadatos de tus grabaciones y gestiona las solicitudes de borrado de tus clientes.",
  },
  {
    icon: Users,
    title: "Conductor",
    description:
      "Revisa todos tus registros de video y ejerce tu derecho de supresión en un clic.",
  },
  {
    icon: ShieldCheck,
    title: "Empresa minera",
    description:
      "Audita que los proveedores respeten los derechos de tus trabajadores.",
  },
];

export default async function HomePage() {
  const profile = await getSessionProfile();

  return (
    <div className="flex min-h-svh flex-col">
      <header className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-2 font-semibold">
          <ShieldCheck className="text-primary size-5" />
          {APP_NAME}
        </div>
        <ThemeToggle />
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-20 sm:px-6">
        <section className="flex flex-col items-start gap-6 py-16 sm:py-24">
          <Badge variant="secondary">
            Ley de Protección de Datos Personales · Chile
          </Badge>
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
            Derechos ARCO para conductores de empresas mineras
          </h1>
          <p className="text-muted-foreground max-w-2xl text-lg">
            {APP_DESCRIPTION} Los proveedores gestionan los reclamos y las
            mineras auditan su cumplimiento, todo en una misma plataforma.
          </p>

          <div className="w-full max-w-sm">
            {profile ? (
              <Button asChild size="lg" className="w-full">
                <Link href={roleHomePath(profile.role)}>
                  Ir a mi panel
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            ) : (
              <SignInButton />
            )}
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-3">
          {ROLES.map((role) => (
            <Card key={role.title}>
              <CardHeader>
                <role.icon className="text-primary mb-2 size-6" />
                <CardTitle>{role.title}</CardTitle>
                <CardDescription>{role.description}</CardDescription>
              </CardHeader>
              <CardContent />
            </Card>
          ))}
        </section>
      </main>

      <footer className="text-muted-foreground border-t px-4 py-6 text-center text-xs sm:px-6">
        {APP_NAME} · MVP de gestión de derechos de acceso, rectificación,
        cancelación y oposición.
      </footer>
    </div>
  );
}
