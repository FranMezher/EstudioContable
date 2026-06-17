"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTransition } from "react";
import {
  Building2,
  LayoutDashboard,
  FileText,
  Users,
  Receipt,
  MessageSquare,
  Bell,
  Settings,
  Landmark,
  Menu,
  X,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { doLogout } from "@/lib/auth-actions";
import { NotificationBell, type NotificationItem } from "./notification-bell";

type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }> };

const adminNav: NavItem[] = [
  { href: "/admin", label: "Inicio", icon: LayoutDashboard },
  { href: "/admin/clientes", label: "Clientes", icon: Users },
  { href: "/admin/consultas", label: "Consultas", icon: MessageSquare },
  { href: "/admin/notificaciones", label: "Notificaciones", icon: Bell },
  { href: "/admin/configuracion", label: "Configuración", icon: Settings },
];

const portalNav: NavItem[] = [
  { href: "/portal", label: "Inicio", icon: LayoutDashboard },
  { href: "/portal/declaraciones", label: "Declaraciones Juradas", icon: FileText },
  { href: "/portal/sindicatos", label: "Sindicatos", icon: Landmark },
  { href: "/portal/recibos", label: "Recibos de Sueldo", icon: Receipt },
  { href: "/portal/consultas", label: "Consultas", icon: MessageSquare },
  { href: "/portal/notificaciones", label: "Notificaciones", icon: Bell },
];

export function AppShell({
  variant,
  user,
  notifications,
  children,
}: {
  variant: "admin" | "portal";
  user: { name: string; subtitle: string };
  notifications: NotificationItem[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const nav = variant === "admin" ? adminNav : portalNav;

  const isActive = (href: string) =>
    href === `/${variant}` ? pathname === href : pathname.startsWith(href);

  return (
    <div className="min-h-screen lg:flex">
      {/* Overlay mobile */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 transform bg-brand-800 transition-transform lg:static lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center gap-2.5 border-b border-white/10 px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-white">Mezher Pampin</p>
            <p className="text-[11px] text-brand-200">
              {variant === "admin" ? "Panel del estudio" : "Portal del cliente"}
            </p>
          </div>
        </div>

        <nav className="space-y-1 p-3">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-white/15 text-white"
                    : "text-brand-100 hover:bg-white/10 hover:text-white"
                )}
              >
                <Icon className="h-[18px] w-[18px]" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 lg:px-6">
          <button
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 lg:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Menú"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <div className="ml-auto flex items-center gap-2">
            <NotificationBell items={notifications} />
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-slate-800">{user.name}</p>
              <p className="text-xs text-slate-500">{user.subtitle}</p>
            </div>
            <button
              disabled={isPending}
              onClick={() => startTransition(() => doLogout())}
              className="flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
