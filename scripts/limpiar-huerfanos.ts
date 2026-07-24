import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { checkBlobAccess, deleteFile, listAllFiles } from "../src/lib/blob";

/**
 * ---------------------------------------------------------------------------
 * ARCHIVOS HUÉRFANOS
 * ---------------------------------------------------------------------------
 *
 * Borra del almacenamiento los PDF que ya no están referenciados por ningún
 * recibo de la base. Aparecen cuando se borran recibos sin poder borrar el
 * archivo (por ejemplo, si el token de Blob estaba mal configurado).
 *
 * Como siempre, simula por defecto:
 *
 *   npm run blob:huerfanos             → lista los huérfanos, no borra
 *   npm run blob:huerfanos:confirmar   → los borra
 */

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const confirmar = process.argv.includes("--confirmar");

async function main() {
  const acceso = await checkBlobAccess();
  if (!acceso.ok) {
    throw new Error(
      `No puedo acceder al almacenamiento: ${acceso.error}\n` +
        "   Revisá BLOB_READ_WRITE_TOKEN en el .env (¿quedó el valor de ejemplo?).\n" +
        "   El token real está en Vercel → Storage → tu Blob store."
    );
  }

  const [enBlob, enBase] = await Promise.all([
    listAllFiles("payslips/"),
    prisma.payslip.findMany({ select: { filePath: true } }),
  ]);

  const referenciados = new Set(enBase.map((p) => p.filePath));
  const huerfanos = enBlob.filter((p) => !referenciados.has(p));

  console.log(`\nArchivos en el almacenamiento: ${enBlob.length}`);
  console.log(`Recibos en la base:            ${enBase.length}`);
  console.log(`Huérfanos (sin recibo):        ${huerfanos.length}\n`);

  if (huerfanos.length === 0) {
    console.log("✅ No hay archivos huérfanos. Todo en orden.\n");
    return;
  }

  for (const p of huerfanos.slice(0, 20)) console.log(`  ${p}`);
  if (huerfanos.length > 20) console.log(`  … y ${huerfanos.length - 20} más`);

  if (!confirmar) {
    console.log("\n🧪 Simulación: no se borró nada.");
    console.log("   Para borrarlos:  npm run blob:huerfanos:confirmar\n");
    return;
  }

  console.log("\nBorrando…");
  let ok = 0;
  let fallo = 0;
  for (const p of huerfanos) {
    if (await deleteFile(p)) ok++;
    else fallo++;
  }
  console.log(`\n✅ ${ok} archivo(s) borrados${fallo ? `, ${fallo} con error` : ""}.\n`);
}

main()
  .catch((e) => {
    console.error(`\n❌ ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
