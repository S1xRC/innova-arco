import { DataPolicyForm } from "@/components/data-policy-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireCompany } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Ajustes" };

export default async function ProviderSettingsPage() {
  const profile = await requireCompany("PROVIDER");
  const supabase = await createClient();

  const [{ data: company }, { data: policy }] = await Promise.all([
    supabase
      .from("companies")
      .select("name, support_email")
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
          Ajustes de la proveedora
        </h1>
        <p className="text-muted-foreground text-sm">
          Publica tu declaración de uso y tratamiento de datos. Es el texto que
          verán los conductores sobre cómo tratas la información de las
          grabaciones.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {company?.name ?? "Mi empresa"}
          </CardTitle>
          <CardDescription>
            Correo de soporte: {company?.support_email ?? "sin configurar"}.
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
