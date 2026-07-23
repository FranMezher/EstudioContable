import { requireStudio } from "@/lib/session";
import { getCompanies } from "@/server/queries";
import { getUsers } from "@/server/users-queries";
import { listApiKeys } from "@/server/apikey-actions";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UsersManager } from "@/components/forms/users-manager";
import { ApiKeysManager } from "@/components/forms/api-keys-manager";

export default async function ConfiguracionPage() {
  const { scope } = await requireStudio();
  const [users, companies, keys] = await Promise.all([
    getUsers(scope),
    getCompanies(scope),
    listApiKeys(),
  ]);

  const opciones = companies.map((c) => ({ id: c.id, name: c.name }));

  return (
    <>
      <PageHeader title="Configuración" description="Accesos al portal e integraciones." />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Accesos</CardTitle>
        </CardHeader>
        <CardContent>
          <UsersManager users={users} companies={opciones} canCreateStudioAdmin />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>API keys</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-slate-500">
            El importador de recibos usa una de estas keys para subir los archivos de la carpeta
            mensual. Una key limitada a una empresa solo puede tocar los datos de esa empresa.
          </p>
          <ApiKeysManager keys={keys} companies={opciones} />
        </CardContent>
      </Card>
    </>
  );
}
