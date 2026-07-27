"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { BRAND } from "@/lib/constants";
import { doLogout } from "@/lib/auth-actions";
import { BrandMark } from "@/components/brand";
import { NotificationBell, type NotificationItem } from "./notification-bell";
import { navFor, subtitleFor } from "./nav";
import type { Role } from "@/generated/prisma/enums";

export function AppShell({
  role,
  user,
  notifications,
  children,
}: {
  role: Role;
  user: { name: string; detail: string };
  notifications: NotificationItem[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // La navegación se arma acá adentro: los iconos de Lucide son componentes y
  // no se pueden pasar como props desde un Server Component.
  const nav = navFor(role);
  const subtitle = subtitleFor(role);

  // Con un solo destino la barra lateral sobra: el empleado ve solo la cabecera.
  const showSidebar = nav.length > 1;
  const root = nav[0]?.href ?? "/";

  const isActive = (href: string) =>
    href === root ? pathname === href : pathname.startsWith(href);

  const initial = user.name.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="min-h-screen lg:flex">
      {showSidebar && mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-ink-900/45 backdrop-blur-[1px] lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {showSidebar && (
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 flex w-64 transform flex-col bg-gradient-to-b from-brand-800 to-brand-900 transition-transform lg:static lg:translate-x-0",
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="flex h-16 items-center gap-3 border-b border-white/10 px-5">
            <BrandMark size="sm" />
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-semibold text-white">{BRAND.name}</p>
              <p className="truncate text-[11px] tracking-wide text-brand-200">{subtitle}</p>
            </div>
          </div>

          <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
            {nav.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-white/12 text-white"
                      : "text-brand-100/90 hover:bg-white/8 hover:text-white"
                  )}
                >
                  {active && (
                    <span className="absolute inset-y-1.5 left-0 w-1 rounded-full bg-accent-400" />
                  )}
                  <Icon
                    className={cn(
                      "h-[18px] w-[18px] transition-colors",
                      active ? "text-white" : "text-brand-200 group-hover:text-white"
                    )}
                  />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-white/10 px-5 py-3">
            <p className="truncate text-xs font-medium text-white">{user.name}</p>
            <p className="truncate text-[11px] text-brand-200">{user.detail}</p>
          </div>
        </aside>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-ink-200/70 bg-white/85 px-4 backdrop-blur-md lg:px-6">
          {showSidebar ? (
            <button
              className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-500 hover:bg-ink-100 lg:hidden"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Menú"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <BrandMark size="sm" />
              <div className="leading-tight">
                <p className="text-sm font-semibold text-ink-800">{BRAND.name}</p>
                <p className="text-[11px] text-ink-500">{subtitle}</p>
              </div>
            </div>
          )}

          <div className="ml-auto flex items-center gap-2.5">
            <NotificationBell items={notifications} />
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium leading-tight text-ink-800">{user.name}</p>
              <p className="text-xs text-ink-500">{user.detail}</p>
            </div>
            <div
              className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700 ring-1 ring-brand-200 sm:flex"
              aria-hidden
            >
              {initial}
            </div>
            <button
              disabled={isPending}
              onClick={() => startTransition(() => doLogout())}
              className="flex h-9 items-center gap-1.5 rounded-lg border border-ink-200 px-3 text-sm font-medium text-ink-600 transition-colors hover:bg-ink-50 hover:text-ink-800 disabled:opacity-50"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
