import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { checkBlobAccess, deleteFile } from "../src/lib/blob";

/**
 * ---------------------------------------------------------------------------
 * LIMPIEZA DE DATOS DE PRUEBA
 * ---------------------------------------------------------------------------
 *
 * Deja la base lista para empezar con clientes reales. Borra empresas,
 * empleados, recibos, accesos e historial de importaciones — y también los
 * PDF del almacenamiento, para no dejar archivos huérfanos.
 *
 * CONSERVA: los usuarios del estudio (STUDIO_ADMIN), las API keys del estudio
 * y la configuración.
 *
 * Por seguridad, sin --confirmar solo muestra qué borraría:
 *
 *   npm run db:limpiar               → simulación (no borra nada)
 *   npm run db:limpiar -- --confirmar → borra de verdad
 */

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const confirmar = process.argv.includes("--confirmar");
/** Limpia la base aunque no se puedan borrar los archivos (quedan huérfanos). */
const sinArchivos = process.argv.includes("--sin-archivos");

async function main() {
  const [companies, employees, payslips, users, runs, studioAdmins, studioKeys] = await Promise.all([
    prisma.company.count(),
    prisma.employee.count(),
    prisma.payslip.count(),
    prisma.user.count({ where: { role: { not: "STUDIO_ADMIN" } } }),
    prisma.importRun.count(),
    prisma.user.count({ where: { role: "STUDIO_ADMIN" } }),
    prisma.apiKey.count({ where: { companyId: null } }),
  ]);

  console.log("\nSE VAN A BORRAR:");
  console.log(`  ${companies} empresa(s)`);
  console.log(`  ${employees} empleado(s)`);
  console.log(`  ${payslips} recibo(s)  (incluidos sus PDF del almacenamiento)`);
  console.log(`  ${users} acceso(s) de empresas y empleados`);
  console.log(`  ${runs} corrida(s) del importador`);
  console.log("\nSE CONSERVAN:");
  console.log(`  ${studioAdmins} usuario(s) del estudio`);
  console.log(`  ${studioKeys} API key(s) del estudio`);
  console.log("  la configuración\n");

  if (companies + employees + payslips + users + runs === 0) {
    console.log("✅ La base ya está limpia. No hay nada que borrar.");
    return;
  }

  if (!confirmar) {
    console.log("🧪 Simulación: no se borró nada.");
    console.log("   Para borrar de verdad:  npm run db:limpiar -- --confirmar\n");
    return;
  }

  if (studioAdmins === 0) {
    throw new Error(
      "No hay ningún usuario del estudio. Si sigo, te quedás sin acceso al portal.\n" +
        "   Corré primero:  npm run db:seed"
    );
  }

  // 1) Los archivos primero: una vez borrada la fila se pierde el path, y el
  //    archivo queda huérfano para siempre. Por eso, si el almacenamiento no
  //    responde, se corta ACÁ sin tocar la base.
  const slips = await prisma.payslip.findMany({ select: { filePath: true } });

  if (slips.length > 0 && sinArchivos) {
    console.log("⚠️  --sin-archivos: no se tocan los PDF. Van a quedar huérfanos en el almacenamiento.");
  } else if (slips.length > 0) {
    const acceso = await checkBlobAccess();
    if (!acceso.ok) {
      throw new Error(
        `No puedo acceder al almacenamiento de archivos: ${acceso.error}\n` +
          "   No borré nada, para no dejar los PDF huérfanos.\n\n" +
          "   Revisá BLOB_READ_WRITE_TOKEN en el .env (¿quedó el valor de ejemplo?).\n" +
          "   El token real está en Vercel → Storage → tu Blob store.\n\n" +
          "   Si preferís limpiar igual y borrar los archivos a mano desde Vercel:\n" +
          "     npx tsx scripts/limpiar-datos.ts --confirmar --sin-archivos"
      );
    }

    console.log("Borrando archivos del almacenamiento…");
    let borrados = 0;
    let fallados = 0;
    for (const s of slips) {
      if (await deleteFile(s.filePath)) borrados++;
      else fallados++;
      const hechos = borrados + fallados;
      if (hechos % 25 === 0) console.log(`  ${hechos}/${slips.length}`);
    }
    console.log(`  ${borrados} archivo(s) borrados${fallados ? `, ${fallados} con error` : ""}.`);
    if (fallados > 0) {
      console.log("  ⚠️  Los que fallaron quedan huérfanos: borralos desde Vercel → Storage.");
    }
  }

  // 2) Las filas, de la más dependiente a la más general.
  console.log("Borrando datos…");
  await prisma.notification.deleteMany({});
  await prisma.importItem.deleteMany({});
  await prisma.importRun.deleteMany({});
  await prisma.payslip.deleteMany({});
  await prisma.user.deleteMany({ where: { role: { not: "STUDIO_ADMIN" } } });
  await prisma.employee.deleteMany({});
  await prisma.company.deleteMany({});

  console.log("\n✅ Listo. La base quedó lista para cargar los clientes reales.");
  console.log("   Tu acceso del estudio sigue funcionando con la misma contraseña.\n");
}

main()
  .catch((e) => {
    console.error(`\n❌ ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
