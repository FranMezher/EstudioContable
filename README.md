# Mezher Pampin — Recibos de Sueldo

Portal de recibos de sueldo del estudio contable **Mezher Pampin**. El estudio carga los recibos (a mano o desde la carpeta mensual, automáticamente) y cada persona ve únicamente lo que le corresponde.

## Los tres niveles de acceso

| Rol | Ve | Puede |
|---|---|---|
| **Estudio** | Todas las empresas y todos los empleados | Todo: empresas, empleados, recibos, accesos, API keys |
| **Admin de empresa** | Solo su empresa | Ver y cargar recibos de sus empleados, gestionar sus accesos |
| **Empleado** | Solo sus propios recibos | Ver y descargar. Nada más: no puede borrar ni editar |

Los admins entran con **email**; los empleados, con su **CUIL** (con o sin guiones). El primer ingreso pide cambiar la contraseña provisoria.

## Cómo se garantiza que no se mezcle la información

Es el requisito central del sistema, así que está resuelto en un solo lugar en vez de repartido por las pantallas: [src/server/scope.ts](src/server/scope.ts).

1. **El alcance sale de la sesión, nunca de la URL ni de un formulario.** Un `companyId` que llega en un form se usa como filtro *adicional* (`AND`), jamás en lugar del filtro de alcance. Si no pertenece, la consulta devuelve vacío por construcción.
2. **Toda consulta pasa por `companyWhere()` / `employeeWhere()` / `payslipWhere()`.** Si una consulta nueva no las usa, está mal.
3. **Para un empleado el filtro es por `employeeId`, no por empresa.** Aunque adivine el id del recibo de un compañero, la query no lo encuentra.
4. **Un recurso fuera del alcance devuelve 404, no 403.** Un 403 confirmaría que existe.
5. **El empleado no tiene ninguna acción de escritura.** No es que la interfaz las oculte: no se le exponen, y además se verifica en la capa de servicio con `assertCanWrite()`.

**Los archivos son privados.** Los PDFs viven en Vercel Blob con acceso privado y en la base se guarda el *pathname*, no una URL. El único camino para leer un recibo es `/api/files/payslip/:id`, que valida sesión y alcance en cada pedido. No hay ninguna URL que se pueda compartir, adivinar o indexar.

## Stack

- **Next.js 16** (App Router) + **TypeScript** + **Tailwind CSS v4**
- **PostgreSQL** (Neon) + **Prisma 7** (driver adapter `@prisma/adapter-pg`)
- **Auth.js (NextAuth v5)** — credenciales, email o CUIL
- **Vercel Blob** privado — almacenamiento de los PDFs

## Puesta en marcha (local)

```bash
npm install
copy .env.example .env      # y completá las variables
npm run db:push             # crea el esquema en la base
npm run db:seed             # crea el usuario del estudio
npm run dev
```

Entrá a http://localhost:3000 con el email y la clave del admin.

Para cargar 2 empresas con 3 empleados cada una y probar el aislamiento:

```bash
SEED_DEMO=1 npm run db:seed
```

## Variables de entorno

| Variable | Para qué | Dónde se obtiene |
|----------|----------|------------------|
| `DATABASE_URL` | Conexión a Postgres | Neon → Connection string |
| `AUTH_SECRET` | Firma de sesiones | `npx auth secret` |
| `BLOB_READ_WRITE_TOKEN` | Guardar y leer los PDFs | Vercel → Storage → Blob |
| `SEED_ADMIN_*` | Usuario inicial del estudio | Lo elegís vos |
| `RECIBOS_ROOT`, `API_URL`, `API_KEY` | Solo en la PC que corre el importador | Ver [docs/IMPORTADOR.md](docs/IMPORTADOR.md) |

## Scripts

- `npm run dev` — desarrollo
- `npm run build` — build de producción
- `npm run db:push` — sincroniza el esquema con la base
- `npm run db:seed` — crea el usuario del estudio (`SEED_DEMO=1` agrega datos de prueba)
- `npm run db:studio` — explorador visual de la base
- `npm run import:recibos` — importador de la carpeta mensual

## Carga de recibos

**A mano**: desde la ficha del empleado, en el panel del estudio o de la empresa.

**Automática**: el script [scripts/import-payslips.ts](scripts/import-payslips.ts) recorre la carpeta donde el estudio guarda los recibos cada mes, deduce a qué empresa y empleado corresponde cada PDF (por el nombre del archivo y, si no alcanza, leyendo el CUIL adentro del PDF) y los sube por la API. Es idempotente: re-correrlo sobre la misma carpeta no duplica nada.

Ver **[docs/IMPORTADOR.md](docs/IMPORTADOR.md)** para configurarlo y programarlo, y **[docs/API.md](docs/API.md)** para la API REST.

---

# Hosting: cómo mantenerlo funcionando 24/7

## La app — Vercel

La app es **serverless**: no hay un proceso corriendo que se pueda caer ni un servidor que haya que reiniciar. Cada visita levanta una función, responde y se apaga. Escala sola si un mes entran 300 empleados a la vez a mirar el recibo.

Para uso comercial hace falta el plan **Pro (~USD 20/mes)**. El plan gratuito no está licenciado para esto y no tiene protección ante picos.

Deploy:
1. Importá el repo de GitHub en Vercel.
2. Cargá las variables en *Project Settings → Environment Variables*.
3. Agregá **Neon Postgres** y **Vercel Blob** desde la pestaña *Storage* (setean sus variables solas).
4. El `postinstall` corre `prisma generate` automáticamente.
5. Después del primer deploy, corré el seed una vez apuntando a la base de producción.

## La base — Neon Postgres

Con 60-80 empresas, SQL sobra de largo: son unos pocos miles de filas por año.

El plan gratuito **autosuspende la base a los 5 minutos** de inactividad, así que la primera consulta después de un rato tarda ~1 segundo. Para operación real conviene **Launch (~USD 19/mes)**: saca el autosuspend y suma backups con recuperación a un punto en el tiempo.

## Los archivos — Vercel Blob privado

Los PDFs no viven en el servidor de la app. En serverless el disco se borra en cada request, así que un archivo guardado ahí desaparece: van a un almacenamiento de objetos replicado, pensado para eso.

Cuenta de capacidad:

```
80 empresas × ~15 empleados × 12 recibos/año × ~100 KB ≈ 14 GB al año
```

A USD 0.023 por GB-mes, son unos pocos dólares mensuales. El primer año no llega a USD 5.

Los blobs son **privados**: no tienen URL pública. Se leen únicamente a través de `/api/files/payslip/:id`, que verifica sesión y alcance en cada descarga.

## Respaldos

- **Base**: Neon guarda el histórico y permite volver a un punto en el tiempo (plan Launch en adelante).
- **Archivos**: conviene un script mensual que recorra el blob con `list()` y baje una copia a un disco del estudio. El respaldo que se puede tocar vale más que la promesa del proveedor.

## Dominio y HTTPS

Dominio propio apuntado a Vercel (ej: `recibos.mezherpampin.com.ar`). El certificado se emite y renueva solo.

## Lo único que no es 24/7: el importador

La carpeta con los recibos vive en una PC del estudio, así que el script depende de que esa máquina esté encendida. **Si está apagada, ese mes no se importa solo** — la app y todos los recibos ya cargados siguen online igual.

Tres formas de convivir con eso:
1. Correrlo en la máquina que de todos modos queda prendida, con la tarea configurada para recuperar ejecuciones perdidas.
2. Mover la carpeta a OneDrive o Google Drive y correr el importador en la nube.
3. Cargar los recibos a mano desde el panel, que siempre está disponible.

## Costo estimado

| Servicio | Plan | Mensual |
|---|---|---|
| Vercel | Pro | ~USD 20 |
| Neon Postgres | Launch | ~USD 19 |
| Vercel Blob | Por uso | ~USD 1-3 |
| Dominio | Anual | ~USD 1,5 prorrateado |
| **Total** | | **~USD 40-45** |
