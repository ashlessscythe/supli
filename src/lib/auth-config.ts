import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";
import { rateLimitService } from "@/server/services/auth.service";
import { isKioskUsername } from "@/lib/sites";

export const authOptions = {
  trustHost: true,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const username =
          typeof credentials?.username === "string"
            ? credentials.username.trim().toLowerCase()
            : "";
        const password =
          typeof credentials?.password === "string"
            ? credentials.password
            : "";

        if (!username || !password) {
          return null;
        }

        if (await rateLimitService.isLocked(username)) {
          return null;
        }

        // Usernames are stored lowercase; use insensitive match as a safeguard.
        const user = await prisma.user.findFirst({
          where: { username: { equals: username, mode: "insensitive" } },
        });

        if (!user || isKioskUsername(user.username)) {
          await rateLimitService.recordFailure(username);
          return null;
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
          await rateLimitService.recordFailure(username);
          return null;
        }

        if (user.role === Role.PENDING) {
          return null;
        }

        if (user.role !== Role.SUPERADMIN && !user.siteId) {
          return null;
        }

        await rateLimitService.reset(username);

        return {
          id: user.id,
          username: user.username,
          role: user.role,
          siteId: user.siteId,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.username = user.username;
        token.role = user.role;
        token.siteId = user.siteId;
      }

      if (token.sub) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { username: true, role: true, siteId: true },
        });
        if (
          !dbUser ||
          dbUser.role === Role.PENDING ||
          isKioskUsername(dbUser.username) ||
          (dbUser.role !== Role.SUPERADMIN && !dbUser.siteId)
        ) {
          delete token.sub;
          delete token.username;
          delete token.role;
          delete token.siteId;
          return token;
        }
        token.username = dbUser.username;
        token.role = dbUser.role;
        token.siteId = dbUser.siteId;
      }

      return token;
    },
    async session({ session, token }) {
      if (!token.sub || !token.role) {
        return {
          ...session,
          user: {
            ...session.user,
            id: "",
            username: "",
            role: Role.STAFF,
            siteId: null,
          },
        };
      }
      return {
        ...session,
        user: {
          ...session.user,
          id: token.sub as string,
          username: token.username as string,
          role: token.role,
          siteId: (token.siteId as string | null | undefined) ?? null,
        },
      };
    },
  },
} satisfies NextAuthConfig;
