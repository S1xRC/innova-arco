import { CompanySettingsForm } from "@/components/company-settings-form";
import { DataPolicyForm } from "@/components/data-policy-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DEFAULT_DELETION_GRACE_DAYS } from "@/lib/constants";
import { requireCompany } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Ajustes" };

export default async function MiningSettingsPage() {
  const profile = await requireCompany("MINING");
  const supabase = await createClient();

  const [{ data: company }, { data: policy }] = await Promise.all([
    supabase
      .from("companies")
      .select("name, support_email, deletion_grace_days")
      .eq("id", profile.companyId)
      .maybeSingle(),
    supabase
      .from("company_data_policies")
      .select("content, updated_at")
      .eq("company_id", profile.companyId)
      .maybeSingle(),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Ajustes de la empresa
        </h1>
        <p className="text-muted-foreground text-sm">
          Configura el plazo de retención de las grabaciones y publica tu
          declaración de uso y tratamiento de datos.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {company?.name ?? "Mi empresa"}
          </CardTitle>
          <CardDescription>
            El plazo por defecto es de {DEFAULT_DELETION_GRACE_DAYS} días. Para
            mostrar el prototipo puedes elegir el{" "}
            <strong>borrado instantáneo</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CompanySettingsForm
            deletionGraceDays={
              company?.deletion_grace_days ?? DEFAULT_DELETION_GRACE_DAYS
            }
            supportEmail={company?.support_email ?? null}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Declaración de uso y tratamiento de datos
          </CardTitle>
          <CardDescription>
            Visible para los conductores en su sección «Uso de datos». Puedes
            partir de la plantilla sugerida y adaptarla a tu empresa.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataPolicyForm
            content={policy?.content ?? ""}
            updatedAt={policy?.updated_at ?? null}
          />
        </CardContent>
      </Card>
    </div>
  );
}

