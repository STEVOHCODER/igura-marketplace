import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionVerified } from "@/lib/auth";

/** Own notification feed, unread first. Paging is deliberately small. */
export async function GET() {
  try {
    const session = await getSessionVerified();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const [items, unread] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: session.userId },
        orderBy: [{ read: "asc" }, { createdAt: "desc" }],
        take: 30,
        select: { id: true, type: true, title: true, message: true, read: true, createdAt: true, metadata: true },
      }),
      prisma.notification.count({ where: { userId: session.userId, read: false } }),
    ]);

    return NextResponse.json({ notifications: items, unread });
  } catch (error) {
    console.error("Get notifications error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** Mark one (?id=) or all notifications read. Only the owner's rows move. */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getSessionVerified();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id") || "";
    if (id && !/^[0-9a-fA-F]{24}$/.test(id)) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }

    await prisma.notification.updateMany({
      where: id
        ? { id, userId: session.userId }
        : { userId: session.userId, read: false },
      data: { read: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Read notifications error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
