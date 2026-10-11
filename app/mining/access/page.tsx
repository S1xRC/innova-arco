import { Activity } from "lucide-react";

import { AccessLogTable } from "@/components/access-log-table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireCompany } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { AccessLogRow } from "@/types";

export const metadata = { title: "Registro de accesos" };

/**
 * ARCO "right of access": every time someone opens one of the mining company's
 * recordings, the access is logged and shown here.
 */
export default async function MiningAccessPage() {
  await requireCompany("MINING");
  const supabase = await createClient();

  // RLS limits these rows to recordings owned by this mining company.
  const { data: logs } = await supabase
    .from("recording_access_log")
    .select("id, video_id, user_id, company_id, action, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  const videoIds = [...new Set((logs ?? []).map((log) => log.video_id))];
  const userIds = [...new Set((logs ?? []).map((log) => log.user_id))];
  const companyIds = [
    ...new Set(
      (logs ?? [])
        .map((log) => log.company_id)
        .filter((value): value is string => Boolean(value)),
    ),
  ];

  const { data: videos } = videoIds.length
    ? await supabase
        .from("video_metadata")
        .select("id, license_plate, recorded_at")
        .in("id", videoIds)
    : { data: [] };

  const { data: users } = userIds.length
    ? await supabase.from("users").select("id, email").in("id", userIds)
    : { data: [] };

  const { data: companies } = companyIds.length
    ? await supabase.from("companies").select("id, name").in("id", companyIds)
    : { data: [] };

  const videosById = new Map((videos ?? []).map((video) => [video.id, video]));
  const usersById = new Map((users ?? []).map((user) => [user.id, user]));
  const companiesById = new Map(
    (companies ?? []).map((company) => [company.id, company]),
  );

  const rows: AccessLogRow[] = (logs ?? []).flatMap((log) => {
    const video = videosById.get(log.video_id);

    if (!video) {
      return [];
    }

    return [
      {
        id: log.id,
        createdAt: log.created_at,
        action: log.action,
        licensePlate: video.license_plate,
        recordedAt: video.recorded_at,
        userEmail: usersById.get(log.user_id)?.email ?? "Usuario",
        companyName: log.company_id
          ? companiesById.get(log.company_id)?.name ?? null
          : null,
      },
    ];
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Registro de accesos
        </h1>
        <p className="text-muted-foreground text-sm">
          Bitácora de quién visualizó cada grabación de tu empresa. Es parte del
          derecho de <strong>acceso</strong> (ARCO).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="size-4" />
            Accesos registrados
          </CardTitle>
          <CardDescription>
            {rows.length > 0
              ? `${rows.length} acceso(s) (máximo 200 más recientes).`
              : "Aún no hay accesos registrados."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length > 0 ? (
            <AccessLogTable rows={rows} />
          ) : (
            <Alert>
              <AlertTitle>Sin actividad</AlertTitle>
              <AlertDescription>
                Cuando alguien reproduzca una grabación, el acceso aparecerá aquí.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
