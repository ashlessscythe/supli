"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

type SocketContextType = {
  socket: Socket | null;
  isConnected: boolean;
};

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

export const useSocket = () => {
  return useContext(SocketContext);
};

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { data: session } = useSession();

  useEffect(() => {
    if (!session?.user) return;

    // Create socket connection
    const socketInstance = io("", {
      path: "/api/socketio",
      addTrailingSlash: false,
    });

    socketInstance.on("connect", () => {
      console.log("Socket connected");
      setIsConnected(true);

      // Join user-specific room for notifications
      socketInstance.emit("join-room", `user-${session.user.id}`);
    });

    socketInstance.on("disconnect", () => {
      console.log("Socket disconnected");
      setIsConnected(false);
    });

    socketInstance.on(
      "notification",
      (notification: { type: string; message: string; data?: any }) => {
        // Handle different types of notifications
        if (notification.type === "low-inventory") {
          toast.error(notification.message, {
            description: "Please check inventory levels",
          });
        } else if (notification.type === "request-status") {
          toast.info(notification.message);
        } else {
          toast(notification.message);
        }
      }
    );

    setSocket(socketInstance);

    // Cleanup on unmount
    return () => {
      socketInstance.disconnect();
    };
  }, [session?.user]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}
