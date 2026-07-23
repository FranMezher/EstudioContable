# API REST — Mezher Pampin

API para el importador de recibos y otras integraciones.
Base URL: `https://TU-APP.vercel.app/api/v1` (en local: `http://localhost:3000/api/v1`).

## Autenticación

```
Authorization: Bearer mp_live_xxxxxxxxxxxxxxxxxxxx
```

Las keys se generan en **Configuración → API keys** del panel del estudio. Hay dos alcances:

- **Acceso total**: opera sobre todas las empresas y puede crear empresas y empleados. Es la que necesita el importador.
- **Limitada a una empresa**: solo lee y escribe datos de esa empresa. Cualquier `companyRef` que mande el cliente se ignora — manda el alcance de la key.

> La clave completa se muestra **una sola vez** al crearla.

## Formato de respuestas

- Éxito: `{ "data": ... }`
- Error: `{ "error": { "message": "..." } }`

Códigos: `200/201` ok · `207` lote con resultados mixtos · `400` datos inválidos · `401` sin key o inválida · `403` sin permiso · `404` no existe (también cuando el recurso está fuera del alcance de la key).

---

## Endpoints

### Probar la key
```
GET /me
```
Devuelve `{ scope: "studio", companies }` o `{ scope: "company", company }`.

### Empresas
```
GET  /companies?q=texto
POST /companies                 # solo con acceso total
```
Body del POST: `{ "name", "cuit?", "email?", "phone?" }`

### Empleados
```
GET  /companies/:id/employees
POST /companies/:id/employees   # { "name", "cuil", "position?" }
```
El CUIL es obligatorio y se valida el dígito verificador.

### Importar recibos

Es el endpoint que usa el script de la carpeta mensual. A diferencia de una carga normal, no hace falta conocer el id del empleado: se resuelve por CUIL dentro de la empresa.

```
POST /payslips/import
POST /payslips/import/bulk      # hasta 50 por lote
```

Body:
```json
{
  "companyRef": "30707429561",
  "cuil": "20285478291",
  "employeeName": "Martín Sosa",
  "periodMonth": 6,
  "periodYear": 2026,
  "netAmount": 850000.00,
  "fileBase64": "JVBERi0...",
  "fileName": "recibo.pdf",
  "sourceHash": "sha256 del archivo"
}
```

- `companyRef`: id o CUIT de la empresa. Se ignora si la key ya está limitada a una.
- `employeeName`: se usa solo si el CUIL todavía no existe. En ese caso se da de alta al empleado marcado como "creado automáticamente", para que el estudio lo revise. **No se le crea acceso al portal**: eso lo confirma siempre una persona.
- `sourceHash`: SHA-256 del archivo. Es lo que hace idempotente al importador — si ese hash ya está cargado, la respuesta es `DUPLICADO` y no se sube nada.

Respuesta: `{ "status": "OK" | "DUPLICADO", "payslipId", "employeeId", "employeeCreated" }`

El `bulk` devuelve `207` con el resultado archivo por archivo: uno que falla no frena a los demás.

### Registro de corridas
```
POST /import-runs                 # { "sourceLabel", "isDryRun?" } → { id }
POST /import-runs/:id/finish      # { "items": [...] }
```
Alimentan la pantalla *Estudio → Importaciones*. El script las llama solo.

---

## Ejemplos

Probar la conexión:
```bash
curl https://TU-APP.vercel.app/api/v1/me \
  -H "Authorization: Bearer mp_live_xxx"
```

Subir un recibo:
```bash
curl -X POST https://TU-APP.vercel.app/api/v1/payslips/import \
  -H "Authorization: Bearer mp_live_xxx" \
  -H "Content-Type: application/json" \
  -d "{\"companyRef\":\"30707429561\",\"cuil\":\"20285478291\",\"periodMonth\":6,\"periodYear\":2026,\"fileBase64\":\"JVBERi0...\",\"fileName\":\"recibo.pdf\",\"sourceHash\":\"abc123\"}"
```

## Descarga de recibos

Los PDFs **no** se sirven por esta API ni por una URL pública. Viven en almacenamiento privado y el único camino es:

```
GET /api/files/payslip/:id            # ver en el navegador
GET /api/files/payslip/:id?download=1 # descargar
```

Esa ruta usa la **sesión web**, no API keys, y valida en cada pedido que el recibo esté dentro del alcance del usuario. Un recibo ajeno devuelve 404.
