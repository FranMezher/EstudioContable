import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

/** CUILs válidos (dígito verificador correcto) para los datos de prueba. */
const DEMO = [
  {
    company: { name: "Acme SRL", cuit: "30707429561" },
    admin: { name: "Laura Giménez", email: "admin@acme.test" },
    employees: [
      { name: "Martín Sosa", cuil: "20285478291", position: "Operario" },
      { name: "Carla Ferreyra", cuil: "27303456781", position: "Administrativa" },
      { name: "Diego Paz", cuil: "20347890123", position: "Encargado" },
    ],
  },
  {
    company: { name: "Norte Distribuciones SA", cuit: "30658472115" },
    admin: { name: "Roberto Díaz", email: "admin@norte.test" },
    employees: [
      { name: "Ana Molina", cuil: "27352145678", position: "Ventas" },
      { name: "Julián Ortiz", cuil: "20401234567", position: "Depósito" },
      { name: "Sofía Rearte", cuil: "27298765432", position: "Contable" },
    ],
  },
];

const DEMO_PASSWORD = "Prueba1234";

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL ?? "admin@estudio.com").toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD ?? "admin1234";
  const name = process.env.SEED_ADMIN_NAME ?? "Administrador";

  const admin = await prisma.user.upsert({
    where: { email },
    update: { role: "STUDIO_ADMIN", name, isActive: true, passwordHash: await bcrypt.hash(password, 10) },
    create: {
      email,
      name,
      passwordHash: await bcrypt.hash(password, 10),
      role: "STUDIO_ADMIN",
    },
  });

  console.log(`✅ Estudio: ${admin.email} / ${password}`);

  if (process.env.SEED_DEMO !== "1") {
    console.log("ℹ️  Para cargar empresas y empleados de prueba: SEED_DEMO=1 npm run db:seed");
    return;
  }

  const demoHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  for (const bloque of DEMO) {
    const company = await prisma.company.upsert({
      where: { cuit: bloque.company.cuit },
      update: { name: bloque.company.name },
      create: bloque.company,
    });

    await prisma.user.upsert({
      where: { email: bloque.admin.email },
      update: { companyId: company.id, role: "COMPANY_ADMIN", passwordHash: demoHash },
      create: {
        ...bloque.admin,
        role: "COMPANY_ADMIN",
        companyId: company.id,
        passwordHash: demoHash,
      },
    });
    console.log(`✅ Empresa ${company.name} — admin ${bloque.admin.email} / ${DEMO_PASSWORD}`);

    for (const emp of bloque.employees) {
      const employee = await prisma.employee.upsert({
        where: { companyId_cuil: { companyId: company.id, cuil: emp.cuil } },
        update: { name: emp.name, position: emp.position },
        create: { ...emp, companyId: company.id },
      });

      await prisma.user.upsert({
        where: { cuil: emp.cuil },
        update: { companyId: company.id, employeeId: employee.id, passwordHash: demoHash },
        create: {
          name: emp.name,
          cuil: emp.cuil,
          role: "EMPLOYEE",
          companyId: company.id,
          employeeId: employee.id,
          passwordHash: demoHash,
        },
      });
      console.log(`   · ${emp.name} — CUIL ${emp.cuil} / ${DEMO_PASSWORD}`);
    }
  }

  console.log(
    "\n⚠️  Los usuarios de prueba entran sin cambio de clave forzado, para poder probar rápido."
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
