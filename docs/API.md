# API REST — Estudio Mezher Pampin

API para integraciones y carga masiva. Base URL: `https://TU-APP.vercel.app/api/v1`
(en local: `http://localhost:3000/api/v1`).

## Autenticación

Todas las peticiones requieren una **API key** en el header:

```
Authorization: Bearer mp_live_xxxxxxxxxxxxxxxxxxxx
```

Las API keys se generan desde el panel admin → **Configuración → API keys**. Hay dos alcances:

- **Acceso total**: puede operar sobre todos los clientes y crear clientes nuevos.
- **Limitada a un cliente**: solo puede leer/escribir datos de ese cliente.

> La clave completa se muestra **una sola vez** al crearla. Guardala en un lugar seguro.

## Formato de respuestas

- Éxito: `{ "data": ... }`
- Error: `{ "error": { "message": "..." } }`
- Lotes (`/bulk`): `{ "data": { "createdCount", "errorCount", "created": [...], "errors": [{ "index", "message" }] } }` (HTTP 207)

Códigos: `200/201` ok · `207` lote parcial · `400` datos inválidos · `401` sin key/ inválida · `403` sin permiso · `404` no existe.

## Archivos (PDFs)

Los endpoints que adjuntan archivos aceptan **una** de estas dos formas en el body:

- `"fileUrl": "https://..."` — referencia a un archivo ya hosteado.
- `"fileBase64": "<contenido>", "fileName": "recibo.pdf"` — se sube a Vercel Blob.

---

## Endpoints

### Probar la key
```
GET /me
```

### Clientes
```
GET  /clients                      # lista (acotada al alcance de la key)
POST /clients                      # crear (solo acceso total)
GET  /clients/:id                  # detalle + conteos
```
Body de `POST /clients`: `{ "name", "cuit?", "email?", "phone?" }`

### Declaraciones Juradas
```
GET  /clients/:id/declarations?type=IVA&year=2026
POST /clients/:id/declarations
POST /clients/:id/declarations/bulk
```
Body: `{ "type": "IVA|IIBB|GANANCIAS|BALANCES", "periodYear", "periodMonth?", "notes?", + archivo }`
Bulk: `{ "items": [ { ...mismos campos... } ] }` (máx. 200)

### Sindicatos
```
GET    /clients/:id/union-items?paid=false
POST   /clients/:id/union-items
PATCH  /union-items/:id            # { "isPaid": true|false }
DELETE /union-items/:id
```
Body de POST: `{ "title", "periodYear", "periodMonth?", "amount?", "description?", + archivo opcional }`

### Empleados y Recibos
```
GET  /clients/:id/employees
POST /clients/:id/employees                  # { "name", "cuil?", "position?" }
GET  /employees/:id/payslips
POST /employees/:id/payslips
POST /employees/:id/payslips/bulk
```
Body recibo: `{ "periodYear", "periodMonth", "netAmount?", + archivo }`

### Consultas
```
GET  /clients/:id/inquiries
POST /clients/:id/inquiries                  # { "subject", "message" }
```

---

## Ejemplos (curl)

Probar la conexión:
```bash
curl https://TU-APP.vercel.app/api/v1/me \
  -H "Authorization: Bearer mp_live_xxx"
```

Cargar una declaración (con URL de archivo):
```bash
curl -X POST https://TU-APP.vercel.app/api/v1/clients/CLIENT_ID/declarations \
  -H "Authorization: Bearer mp_live_xxx" \
  -H "Content-Type: application/json" \
  -d '{"type":"IVA","periodYear":2026,"periodMonth":5,"fileUrl":"https://.../iva.pdf"}'
```

Carga masiva de recibos (base64):
```bash
curl -X POST https://TU-APP.vercel.app/api/v1/employees/EMP_ID/payslips/bulk \
  -H "Authorization: Bearer mp_live_xxx" \
  -H "Content-Type: application/json" \
  -d '{"items":[
        {"periodYear":2026,"periodMonth":5,"fileBase64":"JVBERi0...","fileName":"r1.pdf"},
        {"periodYear":2026,"periodMonth":6,"fileBase64":"JVBERi0...","fileName":"r2.pdf"}
      ]}'
```
