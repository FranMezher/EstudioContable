"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { BRAND } from "@/lib/constants";
import { doLogout } from "@/lib/auth-actions";
import { BrandMark } from "@/components/brand";
import { NotificationBell, type NotificationItem } from "./notification-bell";
import { navFor, subtitleFor } from "./nav";
import type { Role } from "@/generated/prisma/enums";

function todayLabel() {
  const text = new Date().toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

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

  const logoutButton = (
    <button
      disabled={isPending}
      onClick={() => startTransition(() => doLogout())}
      className="flex h-11 items-center rounded-md border border-ink-200 bg-white px-4 text-sm font-medium text-ink-700 transition-colors hover:bg-ink-50 disabled:opacity-50"
    >
      Salir
    </button>
  );

  return (
    <div className="min-h-screen lg:flex">
      {showSidebar && mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-ink-900/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {showSidebar && (
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 transform flex-col gap-8 bg-brand-700 px-5 py-7 text-white transition-transform lg:static lg:translate-x-0",
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="flex items-center gap-3">
            <BrandMark size="md" />
            <div className="min-w-0 leading-tight">
              <p className="truncate font-serif text-lg font-semibold">{BRAND.name}</p>
              <p className="truncate text-xs text-brand-200">{subtitle}</p>
            </div>
          </div>

          {role === "COMPANY_ADMIN" && (
            <div className="rounded-md bg-white/[0.07] px-3 py-2.5">
              <p className="text-xs text-brand-200">Empresa</p>
              <p className="truncate text-sm font-semibold">{user.detail}</p>
            </div>
          )}

          <nav aria-label="Principal" className="flex flex-col gap-0.5">
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
                    "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors",
                    active
                      ? "bg-white/[0.12] font-semibold text-white"
                      : "font-medium text-brand-100 hover:bg-white/[0.07] hover:text-white"
                  )}
                >
                  <Icon className="h-[18px] w-[18px]" aria-hidden />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto border-t border-white/15 pt-4">
            <p className="truncate text-[13px] font-semibold">{user.name}</p>
            <p className="truncate text-xs text-brand-200">
              {role === "STUDIO_ADMIN" ? "Administración del estudio" : user.detail}
            </p>
          </div>
        </aside>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-[72px] items-center gap-3 border-b border-ink-200 bg-white px-4 lg:px-10">
          {showSidebar ? (
            <>
              <button
                className="flex h-11 w-11 items-center justify-center rounded-md text-ink-700 hover:bg-ink-100 lg:hidden"
                onClick={() => setMobileOpen((v) => !v)}
                aria-label="Menú"
              >
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
              <p className="hidden text-sm text-ink-500 sm:block" suppressHydrationWarning>
                {todayLabel()}
              </p>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <BrandMark size="sm" />
              <p className="font-serif text-base font-semibold text-brand-700">{subtitle}</p>
            </div>
          )}

          <div className="ml-auto flex items-center gap-2">
            <NotificationBell items={notifications} />
            {logoutButton}
          </div>
        </header>

        <main className="flex-1 px-4 py-8 lg:px-10 lg:py-10">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
