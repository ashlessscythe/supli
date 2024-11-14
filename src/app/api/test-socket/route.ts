import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    // During build time, return a mock response
    if (process.env.NODE_ENV === "production" && !global.io) {
      return NextResponse.json({
        success: true,
        message: "WebSocket server not available during build",
        notifications: [],
      });
    }

    if (!global.io) {
      throw new Error("Socket.IO not initialized");
    }

    // Get test type from query params
    const { searchParams } = new URL(request.url);
    const testType = searchParams.get("type") || "all";
    const userId = searchParams.get("userId") || "test";

    const notifications = [];

    // Test broadcast notification
    if (testType === "all" || testType === "broadcast") {
      global.io.emit("notification", {
        type: "system",
        message: "Test broadcast notification: WebSocket is working!",
      });
      notifications.push("Broadcast notification sent");
    }

    // Test user-specific notification
    if (testType === "all" || testType === "user") {
      global.io.to(`user-${userId}`).emit("notification", {
        type: "request-status",
        message: `Test user notification for user-${userId}`,
      });
      notifications.push(`User notification sent to user-${userId}`);
    }

    // Test low inventory notification
    if (testType === "all" || testType === "inventory") {
      global.io.emit("notification", {
        type: "low-inventory",
        message: "Test low inventory alert: Paper is running low!",
      });
      notifications.push("Low inventory notification sent");
    }

    return NextResponse.json({
      success: true,
      message: "Test notifications sent",
      notifications,
    });
  } catch (error) {
    console.error("Test notification error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to send test notifications",
      },
      { status: 500 }
    );
  }
}
