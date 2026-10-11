import { Truck } from "lucide-react";

import { InviteProviderForm } from "@/components/invite-provider-form";
import { RelationsTable } from "@/components/relations-table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { requireCompany } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { CompanyRelationRow } from "@/types";

export const metadata = { title: "Proveedoras" };

export default async function MiningProvidersPage() {
  const profile = await requireCompany("MINING");
  const supabase = await createClient();

  const { data: relations } = await supabase
    .from("company_relations")
    .select("id, provider_id, status, created_at, accepted_at")
    .eq("mining_id", profile.companyId)
    .order("created_at", { ascending: false });

  const providerIds = [
    ...new Set((relations ?? []).map((relation) => relation.provider_id)),
  ];

  const { data: providers } = providerIds.length
    ? await supabase
        .from("companies")
        .select("id, name, support_email")
        .in("id", providerIds)
    : { data: [] };

  const providersById = new Map(
    (providers ?? []).map((provider) => [provider.id, provider]),
  );

  const rows: CompanyRelationRow[] = (relations ?? []).map((relation) => {
    const provider = providersById.get(relation.provider_id);

    return {
      id: relation.id,
      providerId: relation.provider_id,
      providerName: provider?.name ?? "Proveedora",
      providerEmail: provider?.support_email ?? null,
      status: relation.status,
      createdAt: relation.created_at,
      acceptedAt: relation.accepted_at,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Proveedoras</h1>
        <p className="text-muted-foreground text-sm">
          Invita a la empresa proveedora de cámaras que contratas. Cuando un
          conductor pida el borrado, la proveedora recibirá una solicitud para
          eliminar la grabación de sus propios sistemas.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Truck className="size-4" />
              Invitar proveedora
            </CardTitle>
            <CardDescription>
              Si la proveedora no existe, se creará automáticamente.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InviteProviderForm />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Relaciones</CardTitle>
            <CardDescription>
              {rows.length > 0
                ? `${rows.length} proveedora(s) vinculada(s).`
                : "Aún no has invitado proveedoras."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Separator />
            <RelationsTable relations={rows} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
