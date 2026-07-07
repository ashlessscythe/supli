import { prisma } from "@/lib/prisma";
import { TokenType } from "@prisma/client";
import crypto from "crypto";

const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const TOKEN_EXPIRY_HOURS: Record<TokenType, number> = {
  EMAIL_VERIFICATION: 24,
  PASSWORD_RESET: 1,
  INVITATION: 72,
};

export const rateLimitService = {
  async isLocked(identifier: string): Promise<boolean> {
    const record = await prisma.authAttempt.findUnique({
      where: { identifier },
    });
    if (!record?.lockedUntil) return false;
    return record.lockedUntil > new Date();
  },

  async recordFailure(identifier: string): Promise<void> {
    const record = await prisma.authAttempt.upsert({
      where: { identifier },
      create: {
        identifier,
        attempts: 1,
        updatedAt: new Date(),
      },
      update: {
        attempts: { increment: 1 },
        updatedAt: new Date(),
      },
    });

    if (record.attempts >= MAX_ATTEMPTS) {
      await prisma.authAttempt.update({
        where: { identifier },
        data: {
          lockedUntil: new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000),
          attempts: 0,
        },
      });
    }
  },

  async reset(identifier: string): Promise<void> {
    await prisma.authAttempt.deleteMany({ where: { identifier } });
  },
};

export const tokenService = {
  generateToken(): string {
    return crypto.randomBytes(32).toString("hex");
  },

  async create(
    type: TokenType,
    email: string,
    userId?: string
  ): Promise<string> {
    const token = this.generateToken();
    const hours = TOKEN_EXPIRY_HOURS[type];

    await prisma.authToken.deleteMany({ where: { email, type } });
    await prisma.authToken.create({
      data: {
        token,
        type,
        email,
        userId,
        expiresAt: new Date(Date.now() + hours * 60 * 60 * 1000),
      },
    });

    return token;
  },

  async validate(token: string, type: TokenType) {
    const record = await prisma.authToken.findUnique({ where: { token } });
    if (!record || record.type !== type) return null;
    if (record.expiresAt < new Date()) {
      await prisma.authToken.delete({ where: { id: record.id } });
      return null;
    }
    return record;
  },

  async consume(token: string): Promise<void> {
    await prisma.authToken.deleteMany({ where: { token } });
  },
};
