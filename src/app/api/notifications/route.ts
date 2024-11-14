import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!global.io) {
      throw new Error("Socket.IO not initialized");
    }

    // Send notification to the specific user's room
    global.io.to(`user-${session.user.id}`).emit("notification", {
      type: "request-status",
      message: "New supply request received",
      data: {
        requestId: "123",
        status: "pending",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Notification sent successfully",
    });
  } catch (error) {
    console.error("Notification error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to send notification",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Here you would typically clear notifications from your database
    // For now we'll just return success since we're using socket-based notifications

    return NextResponse.json({
      success: true,
      message: "Notifications cleared successfully",
    });
  } catch (error) {
    console.error("Clear notifications error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to clear notifications",
      },
      { status: 500 }
    );
  }
}
