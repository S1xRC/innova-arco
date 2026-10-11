import { CompanySettingsForm } from "@/components/company-settings-form";
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

  const { data: company } = await supabase
    .from("companies")
    .select("name, support_email, deletion_grace_days")
    .eq("id", profile.companyId)
    .maybeSingle();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Ajustes de la empresa
        </h1>
        <p className="text-muted-foreground text-sm">
          Configura el plazo de retención de las grabaciones. Para mostrar el
          prototipo puedes elegir el <strong>borrado instantáneo</strong>.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{company?.name ?? "Mi empresa"}</CardTitle>
          <CardDescription>
            El plazo por defecto es de {DEFAULT_DELETION_GRACE_DAYS} días.
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
    </div>
  );
}
