import { Users } from "lucide-react";

import { processDueDeletionsAction } from "@/actions/deletions";
import { ActionButton } from "@/components/action-button";
import { AdminRolesTable } from "@/components/admin-roles-table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requirePlatformAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { AdminUserRow } from "@/types";

export const metadata = { title: "Administración" };

export default async function AdminPage() {
  await requirePlatformAdmin();
  const supabase = await createClient();

  const { data: users } = await supabase
    .from("users")
    .select("id, email, role, full_name, is_platform_admin, created_at")
    .order("created_at", { ascending: false });

  const rows: AdminUserRow[] = (users ?? []).map((user) => ({
    id: user.id,
    email: user.email,
    role: user.role,
    fullName: user.full_name,
    isPlatformAdmin: user.is_platform_admin,
    createdAt: user.created_at,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Administración de la plataforma
        </h1>
        <p className="text-muted-foreground text-sm">
          Asigna roles de forma libre a cualquier usuario y ejecuta el
          procesamiento de borrados vencidos.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Procesar borrados vencidos</CardTitle>
          <CardDescription>
            Elimina las grabaciones cuyo plazo venció (archivo + información
            extra) y marca los turnos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ActionButton
            action={processDueDeletionsAction}
            label="Procesar ahora"
            pendingLabel="Procesando…"
            icon="refresh"
            variant="default"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="size-4" />
            Usuarios
          </CardTitle>
          <CardDescription>
            {rows.length > 0
              ? `${rows.length} usuario(s) registrado(s).`
              : "Sin usuarios."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AdminRolesTable users={rows} />
        </CardContent>
      </Card>
    </div>
  );
}
