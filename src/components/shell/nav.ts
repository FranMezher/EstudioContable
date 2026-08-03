import {
  Building2,
  FileDown,
  LayoutDashboard,
  Receipt,
  Settings,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@/generated/prisma/enums";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const NAV: Record<Role, NavItem[]> = {
  STUDIO_ADMIN: [
    { href: "/estudio", label: "Inicio", icon: LayoutDashboard },
    { href: "/estudio/empresas", label: "Empresas", icon: Building2 },
    { href: "/estudio/importaciones", label: "Importaciones", icon: FileDown },
    { href: "/estudio/configuracion", label: "Configuración", icon: Settings },
  ],
  COMPANY_ADMIN: [
    { href: "/empresa", label: "Empleados", icon: Users },
    { href: "/empresa/pagos", label: "Pagos", icon: Wallet },
    { href: "/empresa/accesos", label: "Accesos", icon: Settings },
  ],
  // El empleado no necesita menú: entra directo a lo único que puede ver.
  EMPLOYEE: [{ href: "/mis-recibos", label: "Mis recibos", icon: Receipt }],
};

export function navFor(role: Role): NavItem[] {
  return NAV[role];
}

export function subtitleFor(role: Role): string {
  switch (role) {
    case "STUDIO_ADMIN":
      return "Panel del estudio";
    case "COMPANY_ADMIN":
      return "Panel de la empresa";
    case "EMPLOYEE":
      return "Recibos de Sueldo";
  }
}
