import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/auth/register/route";
import { userService } from "@/server/services/user.service";
import { siteService } from "@/server/services/site.service";

vi.mock("@/server/services/user.service", () => ({
  userService: {
    register: vi.fn(),
  },
}));

vi.mock("@/server/services/site.service", () => ({
  siteService: {
    getById: vi.fn(),
  },
}));

const validPayload = {
  username: "newuser",
  email: "newuser@example.com",
  password: "Password1",
  siteId: "site-1",
};

function createRegisterRequest(body: unknown) {
  return new Request("http://localhost/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(siteService.getById).mockResolvedValue({
      success: true,
      data: { id: "site-1", name: "Main", slug: "main", isActive: true },
    } as never);
  });

  it("returns 200 and registration message on success", async () => {
    vi.mocked(userService.register).mockResolvedValue({
      success: true,
      data: {
        message:
          "Account created. An admin must approve your account before you can sign in.",
      },
    });

    const response = await POST(createRegisterRequest(validPayload));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.message).toContain("Account created");
    expect(userService.register).toHaveBeenCalledWith(validPayload);
  });

  it("returns 400 when the service reports a business error", async () => {
    vi.mocked(userService.register).mockResolvedValue({
      success: false,
      error: "Username already exists",
    });

    const response = await POST(createRegisterRequest(validPayload));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Username already exists");
  });

  it("returns 400 for invalid input", async () => {
    const response = await POST(
      createRegisterRequest({
        username: "",
        email: "not-an-email",
        password: "short",
      })
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBeDefined();
    expect(userService.register).not.toHaveBeenCalled();
  });

  it("returns 400 for an inactive site", async () => {
    vi.mocked(siteService.getById).mockResolvedValue({
      success: true,
      data: { id: "site-1", isActive: false },
    } as never);

    const response = await POST(createRegisterRequest(validPayload));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Invalid or inactive site");
    expect(userService.register).not.toHaveBeenCalled();
  });
});
