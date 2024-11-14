import { Server as SocketIOServer } from "socket.io";

declare global {
  var io: SocketIOServer;
}

export function getIO(): SocketIOServer {
  if (!global.io) {
    throw new Error("Socket.IO not initialized");
  }
  return global.io;
}

export function emitNotification(
  userId: string,
  notification: {
    type: "low-inventory" | "request-status" | "system";
    message: string;
    data?: any;
  }
) {
  try {
    const io = getIO();
    io.to(`user-${userId}`).emit("notification", notification);
  } catch (error) {
    console.error("Error emitting notification:", error);
  }
}
