import { describe, it, expect, vi, beforeEach } from "vitest";
import { Role, TokenType } from "@prisma/client";
import { ZodError } from "zod";
import { userService } from "@/server/services/user.service";
import { userRepository } from "@/server/repositories/user.repository";
import { emailService } from "@/server/email/email.service";
import { notificationService } from "@/server/services/notification.service";
import { tokenService } from "@/server/services/auth.service";

vi.mock("bcrypt", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("hashed-password"),
  },
}));

vi.mock("@/server/repositories/user.repository", () => ({
  userRepository: {
    findAll: vi.fn(),
    findPending: vi.fn(),
    findByUsername: vi.fn(),
    findByEmail: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    countAdmins: vi.fn(),
  },
}));

vi.mock("@/server/email/email.service", () => ({
  emailService: {
    sendRegistrationReceived: vi.fn(),
    sendRegistrationApproved: vi.fn(),
    sendRegistrationRejected: vi.fn(),
    sendVerification: vi.fn(),
    sendPasswordReset: vi.fn(),
    sendInvitation: vi.fn(),
  },
}));

vi.mock("@/server/services/notification.service", () => ({
  notificationService: {
    notifyAdminsOfRegistration: vi.fn(),
    markRegistrationNotificationsRead: vi.fn(),
    deleteRegistrationNotifications: vi.fn(),
  },
}));

vi.mock("@/server/services/auth.service", () => ({
  tokenService: {
    create: vi.fn(),
    validate: vi.fn(),
    consume: vi.fn(),
  },
}));

describe("userService.register", () => {
  const input = {
    username: "newuser",
    email: "newuser@example.com",
    password: "Password1",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fails when username already exists", async () => {
    vi.mocked(userRepository.findByUsername).mockResolvedValue({ id: "1" } as never);

    const result = await userService.register(input);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Username already exists");
    }
  });

  it("fails when email already in use", async () => {
    vi.mocked(userRepository.findByUsername).mockResolvedValue(null as never);
    vi.mocked(userRepository.findByEmail).mockResolvedValue({ id: "1" } as never);

    const result = await userService.register(input);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Email already in use");
    }
  });

  it("returns zod errors when validation fails", async () => {
    const badInput = { ...input, password: "short" };

    const result = await userService.register(badInput as never);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(Array.isArray(result.error)).toBe(true);
    }
  });
});

describe("userService.verifyEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fails when token is invalid or missing userId", async () => {
    vi.mocked(tokenService.validate).mockResolvedValue(null as never);

    const result = await userService.verifyEmail("bad-token");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Invalid or expired token");
    }
  });

  it("fails when user does not exist", async () => {
    vi.mocked(tokenService.validate).mockResolvedValue({
      id: "t1",
      userId: "u1",
    } as never);
    vi.mocked(userRepository.findById).mockResolvedValue(null as never);

    const result = await userService.verifyEmail("token");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("User not found");
    }
  });

  it("updates user and consumes token on success", async () => {
    vi.mocked(tokenService.validate).mockResolvedValue({
      id: "t1",
      userId: "u1",
    } as never);
    vi.mocked(userRepository.findById).mockResolvedValue({
      id: "u1",
      username: "user",
      role: Role.STAFF,
    } as never);
    vi.mocked(userRepository.update).mockResolvedValue({} as never);

    const result = await userService.verifyEmail("good-token");

    expect(result.success).toBe(true);
    expect(tokenService.consume).toHaveBeenCalledWith("good-token");
    expect(userRepository.update).toHaveBeenCalledWith(
      "u1",
      expect.objectContaining({
        emailVerified: expect.any(Date),
      })
    );
  });
});

describe("userService.forgotPassword", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns success even when user is not found", async () => {
    vi.mocked(userRepository.findByEmail).mockResolvedValue(null as never);

    const result = await userService.forgotPassword({
      email: "missing@example.com",
    });

    expect(result.success).toBe(true);
  });

  it("sends reset email when user exists", async () => {
    vi.mocked(userRepository.findByEmail).mockResolvedValue({
      id: "u1",
      email: "user@example.com",
    } as never);
    vi.mocked(tokenService.create).mockResolvedValue("reset-token");

    const result = await userService.forgotPassword({
      email: "user@example.com",
    });

    expect(result.success).toBe(true);
    expect(tokenService.create).toHaveBeenCalledWith(
      TokenType.PASSWORD_RESET,
      "user@example.com",
      "u1"
    );
    expect(emailService.sendPasswordReset).toHaveBeenCalledWith(
      "user@example.com",
      "reset-token"
    );
  });
});

