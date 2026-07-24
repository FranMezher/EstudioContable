# Limpiar la base de datos

Instructivo para dejar el sistema listo para empezar con clientes reales,
después de haber estado haciendo pruebas.

---

## Antes de empezar: leé esto

**La limpieza no se puede deshacer.** Se borran las empresas, los empleados, los
recibos y los archivos PDF del almacenamiento.

Si ya tenés el plan pago de Neon, la base guarda un histórico y se puede volver
atrás; con el plan gratuito **no hay red de seguridad**. Si tenés dudas, hacé
primero una copia (ver [Respaldo previo](#respaldo-previo-opcional)).

**Un detalle importante:** borrar los recibos desde la base a mano (por SQL o por
Prisma Studio) **no borra los PDF del almacenamiento**. Quedarían archivos
huérfanos ocupando espacio para siempre. Por eso conviene usar el script, que
limpia las dos cosas juntas.

---

## Forma recomendada: el script de limpieza

Desde la carpeta del proyecto, en la terminal.

### Paso 1 — Ver qué se va a borrar (no borra nada)

```bash
npm run db:limpiar
```

Muestra un resumen, por ejemplo:

```
SE VAN A BORRAR:
  4 empresa(s)
  10 empleado(s)
  6 recibo(s)  (incluidos sus PDF del almacenamiento)
  11 acceso(s) de empresas y empleados
  6 corrida(s) del importador

SE CONSERVAN:
  1 usuario(s) del estudio
  1 API key(s) del estudio
  la configuración

🧪 Simulación: no se borró nada.
```

**Revisá los números.** Si te parecen razonables, seguí. Si ves más empresas de
las que esperabas, frená y averiguá por qué antes de borrar.

### Paso 2 — Borrar de verdad

```bash
npm run db:limpiar -- --confirmar
```

> Acordate del `--` suelto: sin él, npm se queda con el `--confirmar` y el script
> vuelve a correr en modo simulación.

Al terminar vas a ver:

```
✅ Listo. La base quedó lista para cargar los clientes reales.
   Tu acceso del estudio sigue funcionando con la misma contraseña.
```

### Qué borra y qué conserva

| Se borra | Se conserva |
|---|---|
| Empresas | **Tu usuario del estudio** (email y contraseña intactos) |
| Empleados y sus datos personales | Las API keys del estudio |
| Recibos **y sus PDF del almacenamiento** | La configuración |
| Accesos de admins de empresa y de empleados | La estructura de la base (tablas) |
| Notificaciones | |
| Historial de importaciones | |

El script **se niega a correr si no queda ningún usuario del estudio**, para que
no te quedes afuera del portal.

---

## Después de limpiar

1. Entrá al portal con tu usuario de siempre — la contraseña no cambió.
2. Cargá las **empresas reales** (*Empresas → Nueva empresa*), con el **CUIT
   exacto** que figura en los recibos. Es el dato con el que el importador
   reconoce a qué empresa pertenece cada archivo.
3. Cargá los **empleados** de cada empresa, con su **CUIL** y su **legajo**
   (también tal cual figuran en el recibo).
4. Creá los **accesos** que hagan falta: el del administrador de cada empresa y
   el de cada empleado, desde su ficha.
5. Recién ahí corré el importador. Acordate de probar primero en seco:
   ```bash
   npm run import:recibos -- --dry-run
   ```

> El importador **no da de alta empresas ni empleados**: si no existen, el
> archivo queda pendiente. Por eso los pasos 2 y 3 van antes.

---

## Respaldo previo (opcional)

Si querés una copia antes de borrar, la forma más simple es desde el panel de
Neon:

1. Entrá a [console.neon.tech](https://console.neon.tech) → tu proyecto.
2. **Branches** → creá una rama nueva (por ejemplo `respaldo-pruebas`).

Una rama es una copia instantánea del estado actual de la base. Si algo sale mal,
podés consultarla. Cuando ya no la necesites, la borrás.

---

## Otras formas de limpiar (para casos puntuales)

### Borrar una sola empresa

Si solo querés sacar **una** empresa de prueba y dejar el resto, hacelo desde
**Prisma Studio**, que es visual:

```bash
npm run db:studio
```

Se abre en `http://localhost:5555`. Entrá a la tabla `Company`, seleccioná la
fila y borrala. Se borran en cascada sus empleados, recibos y accesos.

> ⚠️ Esto **no borra los PDF del almacenamiento**. Para pocas empresas es
> aceptable (quedan unos pocos archivos huérfanos); para una limpieza general,
> usá el script.

### Empezar de cero absoluto

Si preferís borrar **todo, incluido tu usuario del estudio** y recrear las tablas
desde cero:

```bash
npx prisma db push --force-reset
npm run db:seed
```

Esto **destruye toda la base** y la vuelve a crear vacía; el seed recrea tu
usuario del estudio con la contraseña de `SEED_ADMIN_PASSWORD` del `.env`.
Es más agresivo que el script y rara vez hace falta.

---

## Preguntas frecuentes

**¿Pierdo mi acceso al portal?**
No. El script conserva los usuarios del estudio con su misma contraseña.

**¿Tengo que volver a generar la API key del importador?**
No, las keys del estudio se conservan. Las que estaban limitadas a una empresa
de prueba se borran junto con esa empresa.

**¿Se borran las tablas?**
No. La estructura queda intacta; solo se vacían los datos.

**Corrí el script y no borró nada.**
Seguro faltó el `--` antes de `--confirmar`. El comando completo es:
`npm run db:limpiar -- --confirmar`
