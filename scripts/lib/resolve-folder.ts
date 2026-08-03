import fs from "node:fs";

/**
 * La misma carpeta de recibos se ve con distinta letra de unidad según la PC:
 * en el server es local (C:\...), en las demás PCs es la unidad de red
 * mapeada (S:\...). Si la ruta configurada no existe, prueba con la otra
 * letra antes de darse por vencido — así el mismo import.config.json /
 * importador.config.json sirve en cualquiera de las dos.
 */
export function resolveFolder(carpeta: string): string {
  if (fs.existsSync(carpeta)) return carpeta;

  const m = carpeta.match(/^([a-zA-Z]):(.*)$/);
  if (!m) return carpeta;

  const [, drive, resto] = m;
  const alterna = drive.toUpperCase() === "C" ? "S" : drive.toUpperCase() === "S" ? "C" : null;
  if (!alterna) return carpeta;

  const alt = `${alterna}:${resto}`;
  return fs.existsSync(alt) ? alt : carpeta;
}
