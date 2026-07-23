import type {
  CompanyWhereInput,
  EmployeeWhereInput,
  PayslipWhereInput,
} from "@/generated/prisma/models";
import type { Role } from "@/generated/prisma/enums";

/**
 * ---------------------------------------------------------------------------
 * ALCANCE DE ACCESO — la única fuente de verdad sobre qué puede ver cada quien.
 * ---------------------------------------------------------------------------
 *
 * Reglas que sostienen el aislamiento de datos:
 *
 *  1. El Scope se deriva SIEMPRE de la sesión (o de la API key), nunca de un
 *     parámetro de URL ni de un campo de formulario.
 *  2. Toda consulta a empleados o recibos pasa por `employeeWhere()` /
 *     `payslipWhere()`. Un id que llega por la URL se usa como filtro
 *     ADICIONAL (`AND`), nunca en lugar del filtro de alcance.
 *  3. Para un empleado el filtro es por `employeeId`, no por empresa: aunque
 *     adivine el id del recibo de un compañero, la consulta no lo encuentra.
 *  4. Un recurso fuera del alcance devuelve 404, nunca 403 — un 403
 *     confirmaría que el recurso existe.
 *  5. Escribir (crear/borrar) solo lo puede hacer el estudio o el admin de la
 *     empresa. Al empleado no se le expone ninguna acción de escritura, y
 *     además se verifica acá con `assertCanWrite()`.
 */
export type Scope =
  | { kind: "studio" }
  | { kind: "company"; companyId: string }
  | { kind: "employee"; companyId: string; employeeId: string };

/** Error de negocio con código HTTP sugerido. */
export class ServiceError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

/** Construye el Scope a partir de los datos de identidad ya verificados. */
export function scopeFor(identity: {
  role: Role;
  companyId?: string | null;
  employeeId?: string | null;
}): Scope {
  switch (identity.role) {
    case "STUDIO_ADMIN":
      return { kind: "studio" };
    case "COMPANY_ADMIN":
      if (!identity.companyId) {
        throw new ServiceError("El usuario no tiene una empresa asociada", 403);
      }
      return { kind: "company", companyId: identity.companyId };
    case "EMPLOYEE":
      if (!identity.companyId || !identity.employeeId) {
        throw new ServiceError("El usuario no tiene un legajo asociado", 403);
      }
      return {
        kind: "employee",
        companyId: identity.companyId,
        employeeId: identity.employeeId,
      };
  }
}

// ---------------------------------------------------------------------------
// FILTROS
// ---------------------------------------------------------------------------

/** Filtro de empresas visibles. */
export function companyWhere(scope: Scope): CompanyWhereInput {
  if (scope.kind === "studio") return {};
  return { id: scope.companyId };
}

/**
 * Filtro de empleados visibles.
 * Para un empleado devuelve su propia ficha y nada más.
 */
export function employeeWhere(scope: Scope): EmployeeWhereInput {
  switch (scope.kind) {
    case "studio":
      return {};
    case "company":
      return { companyId: scope.companyId };
    case "employee":
      return { id: scope.employeeId };
  }
}

/**
 * Filtro de recibos visibles.
 * Para un empleado filtra por su `employeeId`, no por empresa.
 */
export function payslipWhere(scope: Scope): PayslipWhereInput {
  switch (scope.kind) {
    case "studio":
      return {};
    case "company":
      return { employee: { companyId: scope.companyId } };
    case "employee":
      return { employeeId: scope.employeeId };
  }
}

/**
 * Combina el filtro de alcance con filtros extra que vienen de la UI.
 * Los filtros de la UI NUNCA reemplazan al de alcance: se suman con AND.
 */
export function scoped<T extends object>(base: T, ...extra: (T | undefined)[]): { AND: T[] } {
  return { AND: [base, ...extra.filter((f): f is T => f !== undefined)] };
}

// ---------------------------------------------------------------------------
// PERMISOS DE ESCRITURA
// ---------------------------------------------------------------------------

export function canWrite(scope: Scope): boolean {
  return scope.kind !== "employee";
}

/** Corta la ejecución si el actor no puede escribir. */
export function assertCanWrite(scope: Scope): void {
  if (!canWrite(scope)) {
    throw new ServiceError("Tu usuario solo puede consultar sus recibos", 403);
  }
}

/** Solo el estudio: alta/baja de empresas, API keys, importaciones. */
export function assertStudio(scope: Scope): void {
  if (scope.kind !== "studio") {
    throw new ServiceError("Solo el estudio puede hacer esta operación", 403);
  }
}

/**
 * Valida que una empresa pedida esté dentro del alcance y devuelve su id.
 * Si el alcance ya fija una empresa, esa gana: un id ajeno se rechaza.
 */
export function resolveCompanyId(scope: Scope, requested?: string | null): string {
  if (scope.kind === "studio") {
    if (!requested) throw new ServiceError("Falta indicar la empresa", 400);
    return requested;
  }
  if (requested && requested !== scope.companyId) {
    throw new ServiceError("No encontrado", 404);
  }
  return scope.companyId;
}

/** Ruta de inicio de cada rol. */
export function homeFor(role: Role): string {
  switch (role) {
    case "STUDIO_ADMIN":
      return "/estudio";
    case "COMPANY_ADMIN":
      return "/empresa";
    case "EMPLOYEE":
      return "/mis-recibos";
  }
}
