import { periodoLabel } from "@/lib/constants";

/**
 * Versión del texto de conformidad. Si algún día cambia la redacción, cada
 * firma queda guardada con la versión y el texto exactos que aceptó la persona.
 */
export const CONSENT_VERSION = "1";

/**
 * Declaración que el empleado acepta al firmar. Es firma electrónica en los
 * términos del art. 5 de la Ley 25.506 (no firma digital con certificado).
 */
export function textoConformidad(args: {
  nombre: string;
  cuil: string;
  empresa: string;
  periodMonth: number;
  periodYear: number;
  documentHash: string;
}): string {
  const periodo = periodoLabel(args.periodMonth, args.periodYear);
  return (
    `Yo, ${args.nombre} (CUIL ${args.cuil}), empleado/a de ${args.empresa}, ` +
    `declaro haber recibido y revisado mi recibo de haberes correspondiente al período ${periodo}, ` +
    `y manifiesto mi conformidad conforme a los arts. 138 y siguientes de la Ley de Contrato de Trabajo (Ley 20.744). ` +
    `Firmo este documento en forma electrónica —en los términos del art. 5 de la Ley 25.506— ` +
    `reconociéndolo como propio. El documento firmado corresponde al archivo con huella digital ` +
    `SHA-256 ${args.documentHash}.`
  );
}
