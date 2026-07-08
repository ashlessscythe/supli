import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST as forgotPasswordHandler } from "@/app/api/auth/forgot-password/route";
import { POST as resetPasswordHandler } from "@/app/api/auth/reset-password/route";
import { POST as acceptInviteHandler } from "@/app/api/auth/accept-invite/route";
import { userService } from "@/server/services/user.service";

vi.mock("@/server/services/user.service", () => ({
  userService: {
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
    acceptInvite: vi.fn(),
  },
}));

function createJsonRequest(url: string, body: unknown) {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/forgot-password", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 when service succeeds", async () => {
    vi.mocked(userService.forgotPassword).mockResolvedValue({
      success: true,
      data: { message: "ok" },
    });

    const res = await forgotPasswordHandler(
      createJsonRequest("http://localhost/api/auth/forgot-password", {
        email: "user@example.com",
      })
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.message).toBe("ok");
  });

  it("returns 400 when service fails", async () => {
    vi.mocked(userService.forgotPassword).mockResolvedValue({
      success: false,
      error: "failure",
    });

    const res = await forgotPasswordHandler(
      createJsonRequest("http://localhost/api/auth/forgot-password", {
        email: "user@example.com",
      })
    );
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("failure");
  });
});

describe("POST /api/auth/reset-password", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 when service succeeds", async () => {
    vi.mocked(userService.resetPassword).mockResolvedValue({
      success: true,
      data: { message: "reset" },
    });

    const res = await resetPasswordHandler(
      createJsonRequest("http://localhost/api/auth/reset-password", {
        token: "token",
        password: "Password1",
      })
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.message).toBe("reset");
  });

  it("returns 400 when service fails", async () => {
    vi.mocked(userService.resetPassword).mockResolvedValue({
      success: false,
      error: "bad",
    });

    const res = await resetPasswordHandler(
      createJsonRequest("http://localhost/api/auth/reset-password", {
        token: "token",
        password: "Password1",
      })
    );
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("bad");
  });
});

describe("POST /api/auth/accept-invite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 when service succeeds", async () => {
    vi.mocked(userService.acceptInvite).mockResolvedValue({
      success: true,
      data: { message: "accepted" },
    });

    const res = await acceptInviteHandler(
      createJsonRequest("http://localhost/api/auth/accept-invite", {
        token: "token",
        password: "Password1",
      })
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.message).toBe("accepted");
  });

  it("returns 400 when service fails", async () => {
    vi.mocked(userService.acceptInvite).mockResolvedValue({
      success: false,
      error: "invalid",
    });

    const res = await acceptInviteHandler(
      createJsonRequest("http://localhost/api/auth/accept-invite", {
        token: "token",
        password: "Password1",
      })
    );
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("invalid");
  });
});

