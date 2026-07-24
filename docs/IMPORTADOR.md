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

El importador está afinado para el formato real de los recibos, cuyo nombre es
`Recibos de Sueldos-Liq 1207 -Leg 1020.pdf` (número de liquidación + legajo) y
que adentro trae todos los datos en texto.

1. **Del nombre del archivo** saca el **legajo** (`Leg 1020`) y el **número de
   liquidación** (`Liq 1207`).
2. **Del contenido del PDF** saca el resto (el período NO está en el nombre):
   - CUIT del empleador → identifica la **empresa** sola, sin depender de la carpeta.
   - CUIL, legajo, DNI y nombre del **empleado**.
   - Período ("Remuneración Correspondiente a: ABRIL 2026").
   - Neto a cobrar.
3. **Asignación del empleado**: primero por **CUIL**; si no, por **legajo**
   dentro de la empresa.
4. **Si el PDF es un escaneo sin texto** (no se puede leer el período), el
   archivo queda listado en *Estudio → Importaciones*. Nunca se asigna por aproximación.

> ### El importador nunca da de alta nada
> Si la **empresa** no existe, o el **empleado** no existe en esa empresa, el
> archivo **no se carga**: queda listado en *Estudio → Importaciones* con el
> motivo. Las empresas y los empleados se dan de alta a mano desde el panel.
> Después volvés a correr el importador y esos archivos entran solos.

La empresa se resuelve por el CUIT que viene en el PDF; si no, por el mapa
`scripts/import.config.json` (nombre de carpeta → CUIT). Con el formato actual,
el mapa suele no hacer falta.

### Varios recibos en el mismo mes

Un empleado puede tener **varios recibos en el mismo mes** (sueldo, SAC, bonos):
cada liquidación (`Liq 1207`, `Liq 1218`, …) es un recibo distinto. El importador
los trata como separados y el número de liquidación evita duplicarlos si se
re-corre.

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
   npx tsx scripts/import-payslips.ts --dry-run --carpeta "C:\Recibos"
   ```
   Informa qué detecta en cada archivo sin subir nada — y **no necesita API key**,
   así que sirve para verificar el reconocimiento antes de configurar nada.

5. **Importá de verdad:**
   ```bash
   npx tsx scripts/import-payslips.ts
   ```

> **Si usás `npm run`, separá los flags con `--`**, porque si no npm se los queda:
> ```bash
> npm run import:recibos -- --carpeta "C:\Recibos" --dry-run
> ```

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

En *Estudio → Importaciones* aparecen los **archivos sin asignar**, con el motivo
de cada uno. Los casos típicos:

- *Falta dar de alta la empresa* → creala en el panel con el CUIT que figura en el recibo.
- *Falta dar de alta al empleado* → cargalo en su empresa con el CUIL y el legajo del recibo.

Una vez resueltos, volvés a correr el importador y esos archivos se cargan solos
(los que ya estaban cargados se saltean, no se duplican).

## Problemas frecuentes

| Síntoma | Causa | Solución |
|---|---|---|
| `Falta dar de alta la empresa` | Esa empresa (CUIT) todavía no existe en el portal | Creala desde el panel y volvé a correr |
| `Falta dar de alta al empleado` | Ese legajo/CUIL no existe en la empresa | Cargá al empleado y volvé a correr |
| `sin CUIL` | El PDF es un escaneo sin capa de texto y el nombre no tiene el CUIL | Renombrá el archivo con el CUIL, o cargalo a mano |
| `sin período` | El nombre no tiene fecha reconocible | Renombrá la carpeta del mes como `2026-06` |
| `duplicado` | Ese recibo ya estaba cargado | Es normal al re-correr; no hace falta hacer nada |
| `API key inválida` | La key fue desactivada o está mal copiada | Generá una nueva en Configuración |
