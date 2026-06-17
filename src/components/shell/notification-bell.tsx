"use client";

import { useState, useTransition } from "react";
import { Bell, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/utils";
import { markAllNotificationsRead } from "./notification-actions";

export type NotificationItem = {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
};

export function NotificationBell({ items }: { items: NotificationItem[] }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const unread = items.filter((i) => !i.isRead).length;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
        aria-label="Notificaciones"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <span className="text-sm font-semibold text-slate-800">Notificaciones</span>
              {unread > 0 && (
                <button
                  disabled={isPending}
                  onClick={() => startTransition(() => markAllNotificationsRead())}
                  className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
                >
                  <Check className="h-3 w-3" /> Marcar leídas
                </button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {items.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-slate-400">
                  No tenés notificaciones
                </p>
              ) : (
                items.map((n) => (
                  <div
                    key={n.id}
                    className={cn(
                      "border-b border-slate-50 px-4 py-3 last:border-0",
                      !n.isRead && "bg-brand-50/50"
                    )}
                  >
                    <div className="flex items-start gap-2">
                      {!n.isRead && (
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" />
                      )}
                      <div className={cn(!n.isRead ? "" : "pl-4")}>
                        <p className="text-sm font-medium text-slate-800">{n.title}</p>
                        <p className="text-sm text-slate-500">{n.message}</p>
                        <p className="mt-1 text-xs text-slate-400">
                          {formatDateTime(n.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
