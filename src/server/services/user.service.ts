import crypto from "crypto";
import { z } from "zod";
import bcrypt from "bcrypt";
import { Role, TokenType } from "@prisma/client";
import {
  userSchema,
  userUpdateSchema,
  inviteSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@/lib/validation/user";
import { failure, success } from "@/lib/result";
import { userRepository } from "@/server/repositories/user.repository";
import { executeWithAudit } from "@/server/audit";
import { tokenService } from "@/server/services/auth.service";
import { emailService } from "@/server/email/email.service";

export const userService = {
  async list() {
    try {
      const users = await userRepository.findAll();
      return success(users);
    } catch {
      return failure("Failed to fetch users");
    }
  },

  async create(actorId: string, input: z.infer<typeof userSchema>) {
    try {
      const data = userSchema.parse(input);
      const existing = await userRepository.findByUsername(data.username);
      if (existing) return failure("Username already exists");

      if (data.email) {
        const emailTaken = await userRepository.findByEmail(data.email);
        if (emailTaken) return failure("Email already in use");
      }

      const hashedPassword = await bcrypt.hash(data.password, 10);
      const user = await executeWithAudit(
        actorId,
        `Created user: ${data.username}`,
        (tx) =>
          userRepository.create(
            {
              username: data.username,
              email: data.email ?? null,
              password: hashedPassword,
              role: data.role,
            },
            tx
          )
      );

      if (data.email) {
        const token = await tokenService.create(
          TokenType.EMAIL_VERIFICATION,
          data.email,
          user.id
        );
        await emailService.sendVerification(data.email, token);
      }

      return success(user);
    } catch (error) {
      if (error instanceof z.ZodError) return failure(error.errors);
      return failure("Failed to create user");
    }
  },

  async invite(actorId: string, input: z.infer<typeof inviteSchema>) {
    try {
      const data = inviteSchema.parse(input);
      const existing = await userRepository.findByUsername(data.username);
      if (existing) return failure("Username already exists");

      const emailTaken = await userRepository.findByEmail(data.email);
      if (emailTaken) return failure("Email already in use");

      const tempPassword = await bcrypt.hash(
        crypto.randomBytes(16).toString("hex"),
        10
      );

      const user = await executeWithAudit(
        actorId,
        `Invited user: ${data.username}`,
        (tx) =>
          userRepository.create(
            {
              username: data.username,
              email: data.email,
              password: tempPassword,
              role: data.role,
            },
            tx
          )
      );

      const token = await tokenService.create(
        TokenType.INVITATION,
        data.email,
        user.id
      );
      await emailService.sendInvitation(data.email, token, data.username);

      return success(user);
    } catch (error) {
      if (error instanceof z.ZodError) return failure(error.errors);
      return failure("Failed to send invitation");
    }
  },

  async update(actorId: string, input: z.infer<typeof userUpdateSchema>) {
    try {
      const data = userUpdateSchema.parse(input);
      const { id, ...rest } = data;

      if (rest.role === Role.STAFF) {
        const adminCount = await userRepository.countAdmins();
        const user = await userRepository.findById(id);
        if (adminCount === 1 && user?.role === Role.ADMIN) {
          return failure("Cannot change role of the last admin");
        }
      }

      const updateData: {
        username: string;
        role: Role;
        email?: string | null;
        password?: string;
      } = {
        username: rest.username,
        role: rest.role,
        email: rest.email ?? null,
      };
      if (rest.password) {
        updateData.password = await bcrypt.hash(rest.password, 10);
      }

      const user = await executeWithAudit(
        actorId,
        `Updated user: ${rest.username}`,
        (tx) => userRepository.update(id, updateData, tx)
      );

      return success(user);
    } catch (error) {
      if (error instanceof z.ZodError) return failure(error.errors);
      return failure("Failed to update user");
    }
  },

  async delete(actorId: string, id: string) {
    try {
      const user = await userRepository.findById(id);
      if (!user) return failure("User not found");

      if (user.role === Role.ADMIN) {
        const adminCount = await userRepository.countAdmins();
        if (adminCount === 1) {
          return failure("Cannot delete the last admin");
        }
      }

      await executeWithAudit(
        actorId,
        `Deleted user: ${user.username}`,
        (tx) => userRepository.delete(id, tx)
      );

      return success({ success: true });
    } catch {
      return failure("Failed to delete user");
    }
  },

  async forgotPassword(input: z.infer<typeof forgotPasswordSchema>) {
    try {
      const { email } = forgotPasswordSchema.parse(input);
      const user = await userRepository.findByEmail(email);

      if (user?.email) {
        const token = await tokenService.create(
          TokenType.PASSWORD_RESET,
          user.email,
          user.id
        );
        await emailService.sendPasswordReset(user.email, token);
      }

      return success({
        message: "If an account exists, a reset link was sent.",
      });
    } catch (error) {
      if (error instanceof z.ZodError) return failure(error.errors);
      return failure("Failed to process request");
    }
  },

  async resetPassword(input: z.infer<typeof resetPasswordSchema>) {
    try {
      const data = resetPasswordSchema.parse(input);
      const record = await tokenService.validate(
        data.token,
        TokenType.PASSWORD_RESET
      );
      if (!record?.userId) return failure("Invalid or expired token");

      const user = await userRepository.findById(record.userId);
      if (!user) return failure("User not found");

      const hashed = await bcrypt.hash(data.password, 10);
      await userRepository.update(record.userId, {
        username: user.username,
        password: hashed,
        role: user.role,
      });
      await tokenService.consume(data.token);

      return success({ message: "Password updated successfully" });
    } catch (error) {
      if (error instanceof z.ZodError) return failure(error.errors);
      return failure("Failed to reset password");
    }
  },

  async verifyEmail(token: string) {
    const record = await tokenService.validate(
      token,
      TokenType.EMAIL_VERIFICATION
    );
    if (!record?.userId) return failure("Invalid or expired token");

    const user = await userRepository.findById(record.userId);
    if (!user) return failure("User not found");

    await userRepository.update(record.userId, {
      username: user.username,
      role: user.role,
      emailVerified: new Date(),
    });
    await tokenService.consume(token);

    return success({ message: "Email verified" });
  },

  async acceptInvite(token: string, password: string) {
    const parsed = resetPasswordSchema.pick({ password: true }).safeParse({
      password,
    });
    if (!parsed.success) return failure(parsed.error.errors);

    const record = await tokenService.validate(token, TokenType.INVITATION);
    if (!record?.userId) return failure("Invalid or expired invitation");

    const user = await userRepository.findById(record.userId);
    if (!user) return failure("User not found");

    const hashed = await bcrypt.hash(password, 10);
    await userRepository.update(record.userId, {
      username: user.username,
      password: hashed,
      role: user.role,
      emailVerified: new Date(),
    });
    await tokenService.consume(token);

    return success({ message: "Invitation accepted" });
  },
};
