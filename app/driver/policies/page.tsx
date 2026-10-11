import { FileText, ShieldCheck } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { COMPANY_TYPE_LABELS } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { DataPolicyView } from "@/types";

export const metadata = { title: "Uso y tratamiento de datos" };

/**
 * Read-only view of the data processing declarations that concern this driver:
 * their mining companies and the camera providers those companies work with.
 */
export default async function DriverPoliciesPage() {
  const profile = await requireRole(["DRIVER"]);
  const supabase = await createClient();

  const membershipCompanyIds = [
    ...new Set(profile.memberships.map((membership) => membership.companyId)),
  ];

  const { data: relations } = membershipCompanyIds.length
    ? await supabase
        .from("company_relations")
        .select("provider_id")
        .in("mining_id", membershipCompanyIds)
        .eq("status", "ACTIVE")
    : { data: [] };

  const companyIds = [
    ...new Set([
      ...membershipCompanyIds,
      ...(relations ?? []).map((relation) => relation.provider_id),
    ]),
  ];

  const { data: policies } = companyIds.length
    ? await supabase
        .from("company_data_policies")
        .select("company_id, content, updated_at")
        .in("company_id", companyIds)
    : { data: [] };

  const { data: companies } = companyIds.length
    ? await supabase
        .from("companies")
        .select("id, name, type")
        .in("id", companyIds)
    : { data: [] };

  const policiesByCompany = new Map(
    (policies ?? []).map((policy) => [policy.company_id, policy]),
  );

  const rows: DataPolicyView[] = (companies ?? [])
    .map((company) => {
      const policy = policiesByCompany.get(company.id);

      return {
        companyId: company.id,
        companyName: company.name,
        companyType: company.type,
        content: policy?.content?.trim() ?? "",
        updatedAt: policy?.updated_at ?? null,
      };
    })
    .sort((a, b) => a.companyName.localeCompare(b.companyName));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Uso y tratamiento de datos
        </h1>
        <p className="text-muted-foreground text-sm">
          Cómo tratan tus datos las empresas que participan en la captura de tus
          grabaciones. Puedes consultarlo cuando quieras.
        </p>
      </div>

      {rows.length === 0 ? (
        <Alert>
          <AlertTitle>Sin declaraciones disponibles</AlertTitle>
          <AlertDescription>
            Cuando las empresas publiquen su declaración de uso y tratamiento de
            datos, aparecerá aquí.
          </AlertDescription>
        </Alert>
      ) : (
        rows.map((row) => (
          <Card key={row.companyId}>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="size-4" />
                  {row.companyName}
                </CardTitle>
                <Badge
                  variant={
                    row.companyType === "MINING" ? "outline" : "secondary"
                  }
                >
                  {COMPANY_TYPE_LABELS[row.companyType]}
                </Badge>
              </div>
              <CardDescription>
                {row.updatedAt
                  ? `Última actualización: ${formatDateTime(row.updatedAt)}`
                  : "Sin declaración publicada"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {row.content ? (
                <div className="bg-muted/30 rounded-md border p-4 text-sm leading-relaxed whitespace-pre-wrap">
                  {row.content}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  Esta empresa aún no ha publicado su declaración.
                </p>
              )}
            </CardContent>
          </Card>
        ))
      )}

      <p className="text-muted-foreground text-xs">
        <ShieldCheck className="mr-1 inline size-3" />
        Tus derechos de acceso, rectificación, cancelación y oposición (ARCO) se
        gestionan en «Mis grabaciones».
      </p>
    </div>
  );
}
