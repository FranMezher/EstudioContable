"use client";

import { useTransition } from "react";
import { Bell, Check, CheckCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { markAllNotificationsRead } from "@/components/shell/notification-actions";
import type { NotificationItem } from "@/components/shell/notification-bell";

export function NotificationsPage({ items }: { items: NotificationItem[] }) {
  const [isPending, startTransition] = useTransition();
  const unread = items.filter((i) => !i.isRead).length;

  return (
    <div className="space-y-4">
      {unread > 0 && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            disabled={isPending}
            onClick={() => startTransition(() => markAllNotificationsRead())}
          >
            <CheckCheck className="h-4 w-4" /> Marcar todas como leídas
          </Button>
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState title="Sin notificaciones" description="Acá vas a ver los avisos del sistema." icon={Bell} />
      ) : (
        <Card>
          <ul className="divide-y divide-slate-100">
            {items.map((n) => (
              <li key={n.id} className={cn("flex items-start gap-3 px-5 py-4", !n.isRead && "bg-brand-50/40")}>
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                  {n.isRead ? <Check className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800">{n.title}</p>
                  <p className="text-sm text-slate-600">{n.message}</p>
                  <p className="mt-1 text-xs text-slate-400">{formatDateTime(n.createdAt)}</p>
                </div>
                {!n.isRead && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand-500" />}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
