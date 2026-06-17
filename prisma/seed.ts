import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { SETTING_KEYS } from "../src/lib/constants";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL ?? "admin@estudio.com").toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD ?? "admin1234";
  const name = process.env.SEED_ADMIN_NAME ?? "Administrador";

  const passwordHash = await bcrypt.hash(password, 10);

  const admin = await prisma.user.upsert({
    where: { email },
    update: { role: "ADMIN", name, isActive: true, passwordHash },
    create: { email, name, passwordHash, role: "ADMIN" },
  });

  // Mail destino de consultas (configurable luego desde el panel)
  await prisma.setting.upsert({
    where: { key: SETTING_KEYS.INQUIRY_EMAIL },
    update: {},
    create: { key: SETTING_KEYS.INQUIRY_EMAIL, value: email },
  });

  console.log(`✅ Admin listo: ${admin.email}`);
  console.log(`   Contraseña: ${password}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
