# Importador de recibos

Toma los PDFs de la carpeta donde el estudio guarda los recibos cada mes y los sube al portal, asignando cada uno a su empresa y empleado.

Corre en la PC del estudio y habla con la app **por la API REST**: esa máquina solo necesita una API key. No lleva credenciales de la base ni del almacenamiento.

## Estructura de carpetas esperada

```
C:\Recibos\
  2026-06\
    Acme SRL\
      20285478291.pdf
      27303456781.pdf
    Norte Distribuciones\
      27352145678.pdf
  2026-07\
    ...
```

Lo importante es que **el nombre de alguna carpeta del camino identifique a la empresa**. El período y el CUIL pueden venir en el nombre del archivo, en el de la carpeta, o adentro del PDF.

## Cómo decide a quién corresponde cada archivo

1. **Por el nombre** (rápido, no falla): busca 11 dígitos consecutivos para el CUIL y un período en formato `2026-06`, `06-2026`, `202606` o `Junio 2026`, mirando el archivo y su carpeta.
2. **Por el contenido** (respaldo): si con el nombre no alcanza, abre el PDF, extrae el texto y busca ahí el CUIL, el período, el nombre del empleado y el neto.
3. **Si tampoco alcanza**, el archivo queda listado en *Estudio → Importaciones* con el motivo. Nunca se asigna por aproximación.

La empresa sale del mapa `scripts/import.config.json`.

## Puesta en marcha

1. **Generá una API key** en el portal: *Configuración → API keys*. Para el importador usá una key de **acceso total** (necesita crear empleados en cualquier empresa). Copiala en ese momento: no se vuelve a mostrar.

2. **Armá el mapa de empresas.** Copiá el ejemplo y completalo:
   ```bash
   copy scripts\import.config.example.json scripts\import.config.json
   ```
   ```json
   {
     "companies": {
       "acme srl": "30707429561",
       "norte distribuciones": "30658472115"
     }
   }
   ```
   La clave es el nombre de la carpeta en minúsculas; el valor, el CUIT sin guiones (o el id que aparece en la URL `/estudio/empresas/<id>`). Podés poner varias claves apuntando al mismo CUIT si la carpeta se escribe distinto según el mes.

3. **Configurá el `.env`** en la PC del estudio:
   ```
   RECIBOS_ROOT=C:\Recibos
   API_URL=https://recibos.mezherpampin.com.ar
   API_KEY=mp_live_xxxxxxxxxxxxxxxxxxxx
   ```

4. **Probá primero en seco.** Siempre.
   ```bash
   npx tsx scripts/import-payslips.ts --dry-run
   ```
   Informa qué haría con cada archivo sin subir nada. Revisá que los CUILs y períodos detectados sean los correctos antes de seguir.

5. **Importá de verdad:**
   ```bash
   npx tsx scripts/import-payslips.ts
   ```

### Opciones

| Flag | Para qué |
|---|---|
| `--dry-run` | Informa sin subir nada |
| `--periodo 2026-06` | Solo los archivos cuya ruta contenga ese texto |
| `--empresa "Acme SRL"` | Solo los de esa empresa |
| `--carpeta D:\Otra\Ruta` | Usa esa carpeta en vez de `RECIBOS_ROOT` |

## Correrlo solo todos los meses

El script es **idempotente**: cada archivo se identifica por su SHA-256 y cada empleado no puede tener dos recibos del mismo período. Volver a correrlo sobre la misma carpeta no duplica nada, así que se puede programar sin miedo.

Con el **Programador de tareas de Windows**:

1. Abrí *Programador de tareas* → **Crear tarea básica**.
2. Nombre: `Importar recibos`.
3. Desencadenador: **Mensualmente**, día 5 a las 07:00 (o diario a la madrugada, es igual de seguro).
4. Acción: **Iniciar un programa**
   - Programa: `C:\EstudioContable\scripts\importar-recibos.cmd`
   - Iniciar en: `C:\EstudioContable`
5. En *Condiciones*, destildá "Iniciar solo si el equipo está con CA" si es una notebook.
6. En *Configuración*, tildá "Ejecutar la tarea lo antes posible si se omitió un inicio programado" — cubre los días que la máquina estuvo apagada.

> El importador es la única pieza que depende de que esa PC esté encendida. La app y los recibos ya cargados siguen online igual. Si un mes no corre, se puede correr después a mano o cargar los recibos desde el panel.

## Qué mirar después de cada corrida

En *Estudio → Importaciones*:

- **Empleados creados automáticamente**: el importador los dio de alta a partir del CUIL. Verificá el nombre y creales el acceso al portal desde su ficha.
  El importador **nunca crea accesos solo**: un CUIL mal leído no puede terminar en un acceso a los recibos de otra persona. Ese paso lo confirma siempre una persona.
- **Archivos sin asignar**: con el motivo de cada uno. Se resuelven corrigiendo el nombre del archivo (o el mapa de empresas) y volviendo a correr, o cargándolos a mano.

## Problemas frecuentes

| Síntoma | Causa | Solución |
|---|---|---|
| `sin empresa` | La carpeta no está en `import.config.json` | Agregá esa carpeta al mapa |
| `sin CUIL` | El PDF es un escaneo sin capa de texto y el nombre no tiene el CUIL | Renombrá el archivo con el CUIL, o cargalo a mano |
| `sin período` | El nombre no tiene fecha reconocible | Renombrá la carpeta del mes como `2026-06` |
| `duplicado` | Ese recibo ya estaba cargado | Es normal al re-correr; no hace falta hacer nada |
| `API key inválida` | La key fue desactivada o está mal copiada | Generá una nueva en Configuración |
