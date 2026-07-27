# Importador de recibos

Toma los PDFs de la carpeta donde el estudio guarda los recibos cada mes y los sube al portal, asignando cada uno a su empresa y empleado.

**Lo corre únicamente el estudio.** Los administradores de empresa no usan el
script (no tienen acceso a la carpeta): ellos cargan los recibos a mano desde el
panel, en la ficha de cada empleado.

Corre en la PC del estudio y habla con la app **por la API REST**: esa máquina
solo guarda una **API key**, que es revocable con un clic desde el panel. No
lleva las credenciales de la base ni del almacenamiento, que serían mucho más
peligrosas si esa PC se perdiera.

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

El importador está afinado para los recibos reales del estudio. Acepta las dos
formas de nombre que aparecen:

- `Recibos de Sueldos - Liq 755.pdf` (solo el número de liquidación)
- `Recibos de Sueldos-Liq 1207 -Leg 1020.pdf` (con el legajo también)

Y entiende los **dos formatos de PDF** de los sistemas de liquidación que se
usan, que ordenan los datos distinto por dentro (uno pone `NETO A COBRAR` y el
otro `SUELDO NETO`, uno escribe el CUIT antes de su etiqueta, etc.). Cada dato se
busca con varios patrones, así que no importa cuál de los dos sea.

1. **Del nombre del archivo** saca el **número de liquidación** (`Liq 755`) y, si
   está, el **legajo** (`Leg 1020`).
2. **Del contenido del PDF** saca el resto (el período nunca está en el nombre, y
   el legajo tampoco cuando el nombre no lo trae):
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

3. **Configurá el `.env`** en la PC del estudio. **Se hace una sola vez**: después
   solo corrés el comando, sin pasar credenciales.
   ```
   API_KEY=mp_live_xxxxxxxxxxxxxxxxxxxx
   RECIBOS_ROOT=C:\Recibos
   ```
   `API_URL` no hace falta: el script ya apunta al portal de producción. Solo se
   agrega si el portal cambia de dirección (por ejemplo, al pasar a un dominio propio).

   > La `API_KEY` va **únicamente en el `.env` de esa PC**, que está fuera del repo.
   > Nunca se sube a GitHub. Si la PC se pierde, desactivás la key desde el panel
   > y queda anulada al instante.

4. **Probá primero en seco.** Es lo que hace por defecto:
   ```bash
   npm run import:recibos
   ```
   Informa qué detecta en cada archivo **sin cargar nada** — y no necesita API key,
   así que sirve para verificar el reconocimiento antes de configurar nada.

5. **Importá de verdad**, agregando la confirmación:
   ```bash
   npm run import:recibos:confirmar
   ```

> ### ⚠️ Ojo con los flags en PowerShell
> **PowerShell se come los flags de `npm run`**, incluido el separador `--`. Es
> decir, `npm run import:recibos -- --carpeta "X" --dry-run` **no** le pasa nada
> al script.
>
> Por eso el importador **simula por defecto** y solo carga si recibe
> `--confirmar`: si un flag se pierde, lo peor que pasa es que simule.
>
> Para pasar opciones, llamá al script directamente:
> ```bash
> npx tsx scripts/import-payslips.ts --confirmar --carpeta "C:\Recibos"
> ```

### Opciones

| Flag | Para qué |
|---|---|
| *(ninguno)* | **Simula**: informa sin cargar nada |
| `--confirmar` | Carga de verdad |
| `--periodo 2026-06` | Solo los archivos cuya ruta contenga ese texto |
| `--empresa "Acme SRL"` | Solo los de esa empresa |
| `--carpeta D:\Otra\Ruta` | Usa esa carpeta en vez de `RECIBOS_ROOT` |

## El panel visual (doble clic) — la forma más fácil

Si preferís **botones en vez de la consola**, hay un panel que se abre en el
navegador. Doble clic en **`Panel de importacion.cmd`** y se abre solo una página
(local, en tu PC) con:

- **Una tarjeta por empresa**, con un botón **Importar** y uno **Simular**, y un
  puntito verde/rojo según si encontró la carpeta.
- Un botón **Importar TODAS**.
- El **resultado en vivo** abajo, mientras corre.
- Un formulario **Agregar empresa** (nombre + carpeta): así cargás las empresas
  **sin editar ningún archivo**. También podés quitarlas con la ✕.

Es la opción recomendada para el día a día. Dejá abierta la ventanita negra
mientras lo usás; al cerrarla, se apaga el panel. Por debajo es el mismo
importador de siempre.

## El menú de consola (doble clic) — una carpeta por empresa

Cada empresa guarda sus recibos en su propia carpeta (ej.
`C:\EstudioContable\szeitaku`). En vez de escribir la ruta a mano, hay un **menú**
que se abre con doble clic y lista todas las empresas para elegir cuál importar.

**Puesta a punto (una sola vez):**

1. Copiá el ejemplo y completá tus empresas con sus carpetas:
   ```bash
   copy scripts\importador.config.example.json scripts\importador.config.json
   ```
   ```json
   {
     "empresas": [
       { "nombre": "ZEITAKU S.A.", "carpeta": "C:\\EstudioContable\\szeitaku" },
       { "nombre": "ALFONSO FLORENTIN IRMA", "carpeta": "C:\\EstudioContable\\salfonso" }
     ]
   }
   ```
   (Este archivo queda fuera del repo: es propio de tu PC.)

**Para usarlo:** doble clic en **`Importar recibos.cmd`** (en la carpeta del
proyecto). Se abre una ventana con el menú:

```
  MEZHER PAMPIN · Importador de recibos

  Empresas:
    1)  ●  ZEITAKU S.A.
        C:\EstudioContable\szeitaku
    2)  ●  ALFONSO FLORENTIN IRMA
        C:\EstudioContable\salfonso

    T)  Importar TODAS las empresas
    S)  Simular (ver qué haría, sin cargar nada)
    Q)  Salir
```

- El **●** verde indica que la carpeta existe; el **○** rojo, que no la encontró.
- Elegí el número de una empresa para importarla, **T** para todas, o **S** para
  simular sin cargar nada.
- Antes de importar de verdad, pide confirmación.

> Es el mismo importador de siempre por debajo, con todas sus protecciones
> (no duplica, no da de alta empresas ni empleados). El menú solo evita tener
> que escribir rutas.

## Automatizarlo (correr todos los días a una hora fija)

El script es **idempotente**: cada archivo se identifica por su SHA-256 y una
misma liquidación no se carga dos veces. Volver a correrlo sobre la misma
carpeta **no duplica nada**, así que se puede programar sin miedo. Correrlo a
diario es lo más cómodo: los días que no hay recibos nuevos simplemente no hace
nada, y el día que aparecen se cargan solos.

### Opción A — Un comando (la más rápida)

Abrí **PowerShell como administrador** en la carpeta del proyecto y pegá esto
(cambiá la hora si querés):

```powershell
$accion  = New-ScheduledTaskAction -Execute "C:\EstudioContable\scripts\importar-recibos.cmd" -WorkingDirectory "C:\EstudioContable"
$disparo = New-ScheduledTaskTrigger -Daily -At 7:00am
$config  = New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Hours 1)
Register-ScheduledTask -TaskName "Importar recibos" -Action $accion -Trigger $disparo -Settings $config `
  -Description "Importa los recibos de sueldo de la carpeta mensual al portal."
```

`-StartWhenAvailable` es importante: si la PC estaba apagada a las 7:00, la tarea
se ejecuta apenas se prende.

### Opción B — Con el Programador de tareas (por pantalla)

1. Abrí **Programador de tareas** → **Crear tarea básica**.
2. Nombre: `Importar recibos`.
3. Desencadenador: **Diariamente**, a las **07:00**.
4. Acción: **Iniciar un programa**
   - Programa: `C:\EstudioContable\scripts\importar-recibos.cmd`
   - Iniciar en: `C:\EstudioContable`
5. En *Condiciones*, destildá **"Iniciar solo si el equipo está con CA"** si es una notebook.
6. En *Configuración*, tildá **"Ejecutar la tarea lo antes posible si se omitió un inicio programado"**.

### Cómo saber qué pasó en cada corrida

Cada ejecución queda registrada en **`logs\importador.log`**, dentro de la carpeta
del proyecto. Para ver las últimas líneas:

```powershell
Get-Content logs\importador.log -Tail 40 -Encoding UTF8
```

Y en el portal, *Estudio → Importaciones* muestra el historial de corridas y los
archivos que quedaron sin asignar.

### Comandos útiles de la tarea

```powershell
Start-ScheduledTask   -TaskName "Importar recibos"   # correrla ahora, para probar
Get-ScheduledTaskInfo -TaskName "Importar recibos"   # última ejecución y resultado
Disable-ScheduledTask -TaskName "Importar recibos"   # pausarla
Unregister-ScheduledTask -TaskName "Importar recibos" -Confirm:$false  # eliminarla
```

> **Lo único que no es 24/7 es esto.** El importador depende de que esa PC esté
> encendida; la app y los recibos ya cargados siguen online igual. Si un día no
> corre, con `-StartWhenAvailable` se recupera solo la próxima vez que se prenda,
> y siempre queda la carga manual desde el panel.

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
