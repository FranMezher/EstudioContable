# Firma electrónica de recibos

El empleado puede **firmar** cada recibo desde el portal, dejando su conformidad.
Este documento explica **qué es** esa firma, **qué evidencia** guarda el sistema y
**qué falta del lado del estudio** para que tenga plena validez laboral.

> **Importante:** esto no es asesoramiento legal. Antes de reemplazar el recibo
> en papel por el digital, consultá con un abogado laboralista.

## Qué tipo de firma es

Es **firma electrónica**, en los términos del **art. 5 de la Ley 25.506**.

**No** es "firma digital" en el sentido estricto de esa ley: la firma digital
exige un **certificado de un certificador licenciado** (uno por persona), algo
inviable de tramitar para cada empleado. La diferencia práctica:

- **Firma digital**: la ley presume que fue esa persona y que el documento no se
  alteró. La carga de la prueba la tiene quien lo niega.
- **Firma electrónica** (lo que usamos): es válida como prueba, pero **la carga de
  la prueba recae en quien la invoca**. Por eso su fuerza depende de la calidad de
  la **evidencia** que se guarde.

## Qué evidencia guarda el sistema

Cada firma crea un registro **inmutable** (`PayslipSignature`) con todo lo
necesario para sostenerla ante un reclamo:

| Dato | Para qué sirve |
|---|---|
| **Identidad** (nombre, CUIL, empresa) | Quién firmó — snapshot congelado al momento de firmar |
| **Re-ingreso de contraseña** | Refuerza que fue esa persona (no repudio) |
| **Huella del documento** (SHA-256) | Prueba que el PDF firmado no se modificó |
| **Fecha y hora** | Cuándo se firmó |
| **IP y dispositivo** | Desde dónde se firmó |
| **Texto de conformidad + versión** | Exactamente qué aceptó la persona |
| **Huella del registro** (SHA-256) | Detecta si alguien altera la fila en la base |

Un recibo **firmado no se puede eliminar** desde el panel: eso destruiría la
evidencia.

### Cómo verificar la integridad

La huella del documento (`documentHash`) es el SHA-256 del PDF tal cual se firmó.
Para comprobar que un recibo no cambió, se calcula el SHA-256 del archivo y se
compara con el guardado. En PowerShell:

```powershell
Get-FileHash "recibo.pdf" -Algorithm SHA256
```

Si coincide con el `documentHash` de la firma, el documento es idéntico al firmado.

## Qué falta del lado del estudio (encuadre legal)

El sistema aporta el **medio técnico y la evidencia**, pero por sí solo **no
garantiza** que el recibo digital reemplace al de papel a efectos de la Ley de
Contrato de Trabajo. Para eso, según la jurisdicción, suele hacer falta:

- Tramitar la autorización del **recibo de haberes electrónico** ante el
  **Ministerio de Trabajo (Res. MTEySS 1455/2011)** o la autoridad laboral
  **provincial** que corresponda.
- Garantizar que el empleado **puede acceder y descargar** sus recibos (esto ya
  lo cumple el portal).
- Conservar los registros por los plazos legales.

**Recomendación:** validá el encuadre con un abogado laboralista antes de dejar
de entregar el recibo en papel.

## Para una etapa futura (opcional)

Si más adelante se quiere reforzar aún más:

- **Constancia en PDF**: generar un comprobante descargable con el recibo + los
  datos de la firma, para archivar o presentar.
- **Sello con certificado del estudio (PAdES)**: firmar criptográficamente la
  constancia con un certificado del estudio, dándole integridad fuerte.
- **Sello de tiempo (TSA)**: una marca temporal de una autoridad confiable.
