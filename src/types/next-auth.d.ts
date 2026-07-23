import "next-auth";
import { Role } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username: string;
      role: Role;
      siteId: string | null;
    };
  }

  interface User {
    id: string;
    username: string;
    role: Role;
    siteId: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    username?: string;
    role?: Role;
    siteId?: string | null;
  }
}
