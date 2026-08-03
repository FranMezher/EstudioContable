"use client";

import { useState } from "react";

/**
 * Panel de formulario que se cierra solo cuando la acción terminó bien y queda
 * abierto si falló, para que se vea el error.
 *
 * El estado se DERIVA del resultado de la acción en vez de sincronizarse con
 * un useEffect: llamar a setState dentro de un efecto dispara renders en
 * cascada (react-hooks/set-state-in-effect).
 *
 * El truco es anclar el objeto de resultado que estaba vigente al abrir: como
 * cada ejecución devuelve un objeto nuevo, comparar identidades alcanza para
 * saber si el éxito es posterior a la apertura.
 */
export function useFormPanel<S extends { ok?: boolean }>(state: S) {
  const [anchor, setAnchor] = useState<S | null>(null);

  const succeededSinceOpen = Boolean(state.ok) && state !== anchor;

  return {
    open: anchor !== null && !succeededSinceOpen,
    show: () => setAnchor(state),
    hide: () => setAnchor(null),
  };
}

/**
 * Valor de un solo uso que llega en el resultado de una acción (una
 * contraseña provisoria, una API key) y se puede descartar. Misma idea:
 * se deriva, no se copia a otro estado con un efecto.
 */
export function useOneTimeValue<S extends object>(state: S, pick: (s: S) => string | undefined) {
  const [dismissed, setDismissed] = useState<S | null>(null);
  const value = state === dismissed ? undefined : pick(state);
  return { value, dismiss: () => setDismissed(state) };
}
