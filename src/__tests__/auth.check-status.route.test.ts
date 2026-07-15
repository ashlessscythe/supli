import { beforeEach, describe, expect, it, vi } from "vitest";
import { Role } from "@prisma/client";
import bcrypt from "bcrypt";
import { POST } from "@/app/api/auth/check-status/route";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("bcrypt", () => ({
  default: {
    compare: vi.fn(),
  },
}));

function createRequest(body: unknown) {
  return new Request("http://localhost/api/auth/check-status", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/check-status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns unknown for missing users (no existence leak of role)", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null as never);

    const response = await POST(
      createRequest({ username: "nosuch", password: "Password1" })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ status: "unknown" });
  });

  it("returns unknown for wrong passwords (same as missing user)", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      role: Role.PENDING,
      password: "hash",
    } as never);
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

    const response = await POST(
      createRequest({ username: "pending", password: "WrongPass1" })
    );
    const body = await response.json();

    expect(body).toEqual({ status: "unknown" });
  });

  it("returns pending only when credentials are valid and role is PENDING", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      role: Role.PENDING,
      password: "hash",
    } as never);
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

    const response = await POST(
      createRequest({ username: "pending", password: "Password1" })
    );
    const body = await response.json();

    expect(body).toEqual({ status: "pending" });
  });

  it("returns unknown for valid STAFF credentials (does not confirm login)", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      role: Role.STAFF,
      password: "hash",
    } as never);
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

    const response = await POST(
      createRequest({ username: "staff", password: "Password1" })
    );
    const body = await response.json();

    expect(body).toEqual({ status: "unknown" });
  });

  it("returns unknown for invalid request bodies", async () => {
    const response = await POST(createRequest({ username: "" }));
    const body = await response.json();

    expect(body).toEqual({ status: "unknown" });
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
});
