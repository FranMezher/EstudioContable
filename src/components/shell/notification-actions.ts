"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function markAllNotificationsRead() {
  const session = await auth();
  if (!session?.user) return;
  await prisma.notification.updateMany({
    where: { userId: session.user.id, isRead: false },
    data: { isRead: true },
  });
  revalidatePath("/", "layout");
}

export async function markNotificationRead(id: string) {
  const session = await auth();
  if (!session?.user) return;
  await prisma.notification.updateMany({
    where: { id, userId: session.user.id },
    data: { isRead: true },
  });
  revalidatePath("/", "layout");
}
