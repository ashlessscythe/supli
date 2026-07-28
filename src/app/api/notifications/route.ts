import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { notificationService } from "@/server/services/notification.service";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await notificationService.listForUser(session.user.id);
    const unreadCount = await notificationService.unreadCount(session.user.id);

    return NextResponse.json({
      notifications: result.data,
      unreadCount,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

const patchSchema = z.object({
  id: z.string().min(1).optional(),
  all: z.boolean().optional(),
});

export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const json = await request.json();
    const data = patchSchema.parse(json);

    if (data.all) {
      await notificationService.clearAll(session.user.id);
    } else if (data.id) {
      await notificationService.dismiss(session.user.id, data.id);
    } else {
      return NextResponse.json(
        { error: "Provide id or all: true" },
        { status: 400 }
      );
    }

    const unreadCount = await notificationService.unreadCount(session.user.id);
    return NextResponse.json({ success: true, unreadCount });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
