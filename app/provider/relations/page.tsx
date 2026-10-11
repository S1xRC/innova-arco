import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RelationsTable } from "@/components/relations-table";
import { requireCompany } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { CompanyRelationRow } from "@/types";

export const metadata = { title: "Relaciones" };

export default async function ProviderRelationsPage() {
  const profile = await requireCompany("PROVIDER");
  const supabase = await createClient();

  const { data: relations } = await supabase
    .from("company_relations")
    .select("id, mining_id, status, created_at, accepted_at")
    .eq("provider_id", profile.companyId)
    .order("created_at", { ascending: false });

  const miningIds = [
    ...new Set((relations ?? []).map((relation) => relation.mining_id)),
  ];

  const { data: miningCompanies } = miningIds.length
    ? await supabase
        .from("companies")
        .select("id, name, support_email")
        .in("id", miningIds)
    : { data: [] };

  const miningById = new Map(
    (miningCompanies ?? []).map((company) => [company.id, company]),
  );

  const rows: CompanyRelationRow[] = (relations ?? []).map((relation) => {
    const mining = miningById.get(relation.mining_id);

    return {
      id: relation.id,
      providerId: relation.mining_id,
      providerName: mining?.name ?? "Minera",
      providerEmail: mining?.support_email ?? null,
      status: relation.status,
      createdAt: relation.created_at,
      acceptedAt: relation.accepted_at,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Relaciones</h1>
        <p className="text-muted-foreground text-sm">
          Invitaciones de relación enviadas por las empresas mineras que te
          contratan.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mineras vinculadas</CardTitle>
          <CardDescription>
            Acepta una invitación para formalizar la relación.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length > 0 ? (
            <RelationsTable relations={rows} showAccept />
          ) : (
            <Alert>
              <AlertTitle>Sin relaciones</AlertTitle>
              <AlertDescription>
                Aún no has recibido invitaciones de empresas mineras.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
