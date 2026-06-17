# Estudio Mezher Pampin — Gestión de clientes

Aplicación web multi-cliente para el estudio contable **Mezher Pampin**.

## Funcionalidades

- **Login por rol**: el estudio (admin) ve y gestiona todos los clientes; cada cliente ve solo su información.
- **Declaraciones Juradas**: IVA, IIBB, Ganancias y Balances, organizadas por período (mes/año).
- **Sindicatos**: el estudio carga los aportes y el cliente marca **OK** al pagar.
- **Recibos de Sueldo**: por empleado y período.
- **Consultas**: el cliente las envía, llegan por email (destino configurable) y quedan registradas.
- **Notificaciones**: campanita in-app + email ante novedades.
- Ambos (estudio y cliente) pueden cargar documentación.

## Stack

- **Next.js 16** (App Router) + **TypeScript** + **Tailwind CSS v4**
- **PostgreSQL** (Neon) + **Prisma 7** (driver adapter `@prisma/adapter-pg`)
- **Auth.js (NextAuth v5)** — email + contraseña
- **Vercel Blob** — almacenamiento de PDFs
- **Resend** — envío de emails

## Puesta en marcha (local)

1. Instalá dependencias:
   ```bash
   npm install
   ```

2. Copiá `.env.example` a `.env` y completá las variables (ver abajo).

3. Creá las tablas en la base y cargá el admin inicial:
   ```bash
   npm run db:push     # crea el esquema en la base
   npm run db:seed     # crea el usuario admin (según SEED_ADMIN_*)
   ```

4. Levantá el servidor:
   ```bash
   npm run dev
   ```
   Entrá a http://localhost:3000 con el email/clave del admin.

## Variables de entorno

| Variable | Para qué | Dónde se obtiene |
|----------|----------|------------------|
| `DATABASE_URL` | Conexión a Postgres | Neon → Connection string |
| `AUTH_SECRET` | Firma de sesiones | `npx auth secret` |
| `BLOB_READ_WRITE_TOKEN` | Subir/leer PDFs | Vercel → Storage → Blob |
| `RESEND_API_KEY` | Envío de emails | Resend → API Keys |
| `EMAIL_FROM` | Remitente de emails | Dominio verificado en Resend |
| `SEED_ADMIN_*` | Admin inicial | Lo elegís vos |

## Scripts útiles

- `npm run dev` — desarrollo
- `npm run build` — build de producción
- `npm run db:push` — sincroniza el esquema con la base (sin migraciones)
- `npm run db:migrate` — crea una migración versionada
- `npm run db:seed` — crea el admin inicial
- `npm run db:studio` — explorador visual de la base

## API REST (integraciones y carga masiva)

La app expone una API REST versionada en `/api/v1`, autenticada con **API keys** (Bearer token) que se generan desde **Configuración → API keys** en el panel admin. Soporta scope por cliente y carga masiva.

Ver la documentación completa en **[docs/API.md](docs/API.md)**.

## Deploy en Vercel

1. Subí el repo a GitHub e importalo en Vercel.
2. Cargá todas las variables de entorno en **Project Settings → Environment Variables**.
3. Agregá **Neon Postgres** y **Vercel Blob** desde la pestaña Storage (setean variables solas).
4. El `postinstall` corre `prisma generate` automáticamente.
5. Después del primer deploy, corré el seed una vez (localmente apuntando a la base de producción, o con `vercel env pull` + `npm run db:seed`).
