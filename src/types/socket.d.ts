import { Server } from "socket.io";

declare global {
  // eslint-disable-next-line no-var
  var io: Server;
}
