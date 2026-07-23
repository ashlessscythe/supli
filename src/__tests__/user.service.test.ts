import { describe, it, expect, vi, beforeEach } from "vitest";
import { Role, TokenType } from "@prisma/client";
import { userService } from "@/server/services/user.service";
import { userRepository } from "@/server/repositories/user.repository";
import { emailService } from "@/server/email/email.service";
import { notificationService } from "@/server/services/notification.service";
import { tokenService } from "@/server/services/auth.service";
import { prisma } from "@/lib/prisma";

vi.mock("bcrypt", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("hashed-password"),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
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
    isSystemKiosk: vi.fn(),
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
    siteId: "site-1",
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

describe("userService.invite", () => {
  const actorId = "admin-1";
  const input = {
    username: "invitee",
    email: "invitee@example.com",
    role: Role.STAFF,
  };
  const tx = { auditLog: { create: vi.fn() } };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.$transaction).mockImplementation(async (operation) =>
      operation(tx as never)
    );
  });

  it("fails when username already exists", async () => {
    vi.mocked(userRepository.findByUsername).mockResolvedValue({ id: "1" } as never);

    const result = await userService.invite(actorId, "site-1", input);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Username already exists");
    }
  });

  it("fails when email already in use", async () => {
    vi.mocked(userRepository.findByUsername).mockResolvedValue(null as never);
    vi.mocked(userRepository.findByEmail).mockResolvedValue({ id: "1" } as never);

    const result = await userService.invite(actorId, "site-1", input);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Email already in use");
    }
  });

  it("creates user, invitation token, and sends invite email", async () => {
    const created = { id: "u-inv", username: input.username, role: Role.STAFF };
    vi.mocked(userRepository.findByUsername).mockResolvedValue(null as never);
    vi.mocked(userRepository.findByEmail).mockResolvedValue(null as never);
    vi.mocked(userRepository.create).mockResolvedValue(created as never);
    vi.mocked(tokenService.create).mockResolvedValue("invite-token");

    const result = await userService.invite(actorId, "site-1", input);

    expect(result.success).toBe(true);
    expect(tokenService.create).toHaveBeenCalledWith(
      TokenType.INVITATION,
      input.email,
      created.id
    );
    expect(emailService.sendInvitation).toHaveBeenCalledWith(
      input.email,
      "invite-token",
      input.username
    );
  });
});

describe("userService.acceptInvite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects weak passwords via zod", async () => {
    const result = await userService.acceptInvite("token", "short");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(Array.isArray(result.error)).toBe(true);
    }
    expect(tokenService.validate).not.toHaveBeenCalled();
  });

  it("fails when invitation token is invalid", async () => {
    vi.mocked(tokenService.validate).mockResolvedValue(null as never);

    const result = await userService.acceptInvite("bad", "Password1");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Invalid or expired invitation");
    }
  });

  it("sets password, marks email verified, and consumes token", async () => {
    vi.mocked(tokenService.validate).mockResolvedValue({
      id: "t1",
      userId: "u1",
    } as never);
    vi.mocked(userRepository.findById).mockResolvedValue({
      id: "u1",
      username: "invitee",
      role: Role.STAFF,
    } as never);
    vi.mocked(userRepository.update).mockResolvedValue({} as never);

    const result = await userService.acceptInvite("good-token", "Password1");

    expect(result.success).toBe(true);
    expect(userRepository.update).toHaveBeenCalledWith(
      "u1",
      expect.objectContaining({
        password: "hashed-password",
        emailVerified: expect.any(Date),
      })
    );
    expect(tokenService.consume).toHaveBeenCalledWith("good-token");
  });
});

describe("userService.resetPassword", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fails when reset token is invalid", async () => {
    vi.mocked(tokenService.validate).mockResolvedValue(null as never);

    const result = await userService.resetPassword({
      token: "bad",
      password: "Password1",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Invalid or expired token");
    }
  });

  it("updates password and consumes token on success", async () => {
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

    const result = await userService.resetPassword({
      token: "reset-token",
      password: "Password1",
    });

    expect(result.success).toBe(true);
    expect(tokenService.consume).toHaveBeenCalledWith("reset-token");
  });
});

describe("userService last-admin guards", () => {
  const tx = { auditLog: { create: vi.fn() } };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.$transaction).mockImplementation(async (operation) =>
      operation(tx as never)
    );
  });

  it("refuses to demote the last admin", async () => {
    vi.mocked(userRepository.countAdmins).mockResolvedValue(1);
    vi.mocked(userRepository.findById).mockResolvedValue({
      id: "admin-1",
      role: Role.ADMIN,
      username: "walter",
      siteId: "site-1",
    } as never);

    const result = await userService.update("actor", "site-1", {
      id: "admin-1",
      username: "walter",
      role: Role.STAFF,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Cannot change role of the last admin");
    }
  });

  it("allows demoting an admin when another admin remains", async () => {
    vi.mocked(userRepository.countAdmins).mockResolvedValue(2);
    vi.mocked(userRepository.findById).mockResolvedValue({
      id: "admin-1",
      role: Role.ADMIN,
      username: "walter",
      siteId: "site-1",
    } as never);
    vi.mocked(userRepository.update).mockResolvedValue({
      id: "admin-1",
      role: Role.STAFF,
    } as never);

    const result = await userService.update("actor", "site-1", {
      id: "admin-1",
      username: "walter",
      role: Role.STAFF,
    });

    expect(result.success).toBe(true);
  });

  it("refuses to delete the last admin", async () => {
    vi.mocked(userRepository.findById).mockResolvedValue({
      id: "admin-1",
      role: Role.ADMIN,
      username: "walter",
      siteId: "site-1",
    } as never);
    vi.mocked(userRepository.countAdmins).mockResolvedValue(1);

    const result = await userService.delete("actor", "site-1", "admin-1");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Cannot delete the last admin");
    }
  });
});

describe("userService registration approval", () => {
  const tx = { auditLog: { create: vi.fn() } };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.$transaction).mockImplementation(async (operation) =>
      operation(tx as never)
    );
  });

  it("rejects approve when user is not pending", async () => {
    vi.mocked(userRepository.findById).mockResolvedValue({
      id: "u1",
      role: Role.STAFF,
      username: "already",
      siteId: "site-1",
    } as never);

    const result = await userService.approveRegistration("admin", "u1", "site-1");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("User is not pending approval");
    }
  });

  it("approves pending user, clears registration notifs, and emails", async () => {
    vi.mocked(userRepository.findById).mockResolvedValue({
      id: "u1",
      role: Role.PENDING,
      username: "newbie",
      email: "newbie@example.com",
      siteId: "site-1",
    } as never);
    vi.mocked(userRepository.update).mockResolvedValue({
      id: "u1",
      role: Role.STAFF,
    } as never);

    const result = await userService.approveRegistration("admin", "u1", "site-1");

    expect(result.success).toBe(true);
    expect(notificationService.deleteRegistrationNotifications).toHaveBeenCalledWith(
      "u1"
    );
    expect(emailService.sendRegistrationApproved).toHaveBeenCalledWith(
      "newbie@example.com",
      "newbie"
    );
  });

  it("rejects pending user, deletes them, and clears registration notifs", async () => {
    vi.mocked(userRepository.findById).mockResolvedValue({
      id: "u1",
      role: Role.PENDING,
      username: "newbie",
      email: "newbie@example.com",
      siteId: "site-1",
    } as never);

    const result = await userService.rejectRegistration("admin", "u1", "site-1");

    expect(result.success).toBe(true);
    expect(userRepository.delete).toHaveBeenCalledWith("u1", tx);
    expect(notificationService.deleteRegistrationNotifications).toHaveBeenCalledWith(
      "u1"
    );
    expect(emailService.sendRegistrationRejected).toHaveBeenCalledWith(
      "newbie@example.com",
      "newbie"
    );
  });
});

