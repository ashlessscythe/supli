import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";
import { rateLimitService } from "@/server/services/auth.service";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        const identifier = credentials.username.toLowerCase();

        if (await rateLimitService.isLocked(identifier)) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { username: credentials.username },
        });

        if (!user) {
          await rateLimitService.recordFailure(identifier);
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          await rateLimitService.recordFailure(identifier);
          return null;
        }

        if (user.role === Role.PENDING) {
          return null;
        }

        await rateLimitService.reset(identifier);

        return {
          id: user.id,
          username: user.username,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.username = user.username;
        token.role = user.role;
      }

      if (token.sub) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { username: true, role: true },
        });
        if (!dbUser || dbUser.role === Role.PENDING) {
          delete token.sub;
          delete token.username;
          delete token.role;
          return token;
        }
        token.username = dbUser.username;
        token.role = dbUser.role;
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
        },
      };
    },
  },
};
