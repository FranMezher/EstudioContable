import { prisma } from "@/lib/prisma";
import type { NotificationType } from "@/generated/prisma/enums";
import type { NotificationItem } from "@/components/shell/notification-bell";

/** Crea una notificación in-app para un usuario. */
export async function createNotification(args: {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
}) {
  await prisma.notification.create({ data: args });
}

/** Crea la misma notificación para varios usuarios (ej: todos los admins). */
export async function notifyUsers(
  userIds: string[],
  data: { type: NotificationType; title: string; message: string; link?: string }
) {
  if (userIds.length === 0) return;
  await prisma.notification.createMany({
    data: userIds.map((userId) => ({ userId, ...data })),
  });
}

/** Ids de los usuarios del estudio, para avisos internos. */
export async function getStudioUserIds(): Promise<string[]> {
  const admins = await prisma.user.findMany({
    where: { role: "STUDIO_ADMIN", isActive: true },
    select: { id: true },
  });
  return admins.map((a) => a.id);
}

/** Obtiene las últimas notificaciones del usuario (serializadas para el cliente). */
export async function getNotifications(userId: string): Promise<NotificationItem[]> {
  const items = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return items.map((n) => ({
    id: n.id,
    title: n.title,
    message: n.message,
    isRead: n.isRead,
    createdAt: n.createdAt.toISOString(),
  }));
}
