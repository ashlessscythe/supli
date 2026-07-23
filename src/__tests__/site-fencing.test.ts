import { beforeEach, describe, expect, it, vi } from "vitest";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { supplyRepository } from "@/server/repositories/supply.repository";
import { siteService } from "@/server/services/site.service";
import { siteRepository } from "@/server/repositories/site.repository";
import { userRepository } from "@/server/repositories/user.repository";

const SITE_ID = "site-1";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
    supply: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("@/server/repositories/site.repository", () => ({
  siteRepository: {
    findAll: vi.fn(),
    findActive: vi.fn(),
    findById: vi.fn(),
    findBySlug: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@/server/repositories/user.repository", () => ({
  userRepository: {
    findById: vi.fn(),
    update: vi.fn(),
  },
}));

describe("supplyRepository site fencing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("findAll scopes queries by siteId", async () => {
    vi.mocked(prisma.supply.findMany).mockResolvedValue([] as never);

    await supplyRepository.findAll(SITE_ID);

    expect(prisma.supply.findMany).toHaveBeenCalledWith({
      where: { siteId: SITE_ID },
      orderBy: { name: "asc" },
    });
  });

  it("findById scopes lookups by id and siteId", async () => {
    vi.mocked(prisma.supply.findFirst).mockResolvedValue(null as never);

    await supplyRepository.findById("supply-1", SITE_ID);

    expect(prisma.supply.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "supply-1", siteId: SITE_ID },
      })
    );
  });
});

describe("siteService.assignUser fencing", () => {
  const actorId = "super-1";
  const tx = { auditLog: { create: vi.fn() } };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.$transaction).mockImplementation(async (operation) =>
      operation(tx as never)
    );
    vi.mocked(siteRepository.findById).mockResolvedValue({
      id: SITE_ID,
      name: "Main",
      slug: "main",
    } as never);
  });

  it("refuses assigning SUPERADMIN users to a site", async () => {
    vi.mocked(userRepository.findById).mockResolvedValue({
      id: "u-super",
      username: "root",
      role: Role.SUPERADMIN,
      siteId: null,
    } as never);

    const result = await siteService.assignUser(
      actorId,
      "u-super",
      SITE_ID,
      "ADMIN"
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Cannot assign SUPERADMIN to a site");
    }
    expect(userRepository.update).not.toHaveBeenCalled();
  });

  it("refuses moving kiosk users between sites", async () => {
    vi.mocked(userRepository.findById).mockResolvedValue({
      id: "u-kiosk",
      username: "kiosk-main",
      role: Role.STAFF,
      siteId: SITE_ID,
    } as never);

    const result = await siteService.assignUser(
      actorId,
      "u-kiosk",
      "site-2",
      "STAFF"
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Cannot move kiosk users between sites");
    }
    expect(userRepository.update).not.toHaveBeenCalled();
  });
});

describe("siteService.create", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a site when the slug is available", async () => {
    vi.mocked(siteRepository.findBySlug).mockResolvedValue(null as never);
    vi.mocked(siteRepository.create).mockResolvedValue({
      id: "site-new",
      name: "Alpha",
      slug: "alpha",
      isActive: true,
    } as never);
    vi.mocked(prisma.$transaction).mockImplementation(async (operation) =>
      operation({
        auditLog: { create: vi.fn() },
      } as never)
    );

    const result = await siteService.create("actor-1", {
      name: "Alpha",
      slug: "alpha",
    });

    expect(result.success).toBe(true);
    expect(siteRepository.create).toHaveBeenCalledWith(
      { name: "Alpha", slug: "alpha" },
      expect.anything()
    );
  });

  it("rejects duplicate slugs", async () => {
    vi.mocked(siteRepository.findBySlug).mockResolvedValue({
      id: "existing",
      slug: "alpha",
    } as never);

    const result = await siteService.create("actor-1", {
      name: "Alpha",
      slug: "alpha",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("A site with that slug already exists");
    }
    expect(siteRepository.create).not.toHaveBeenCalled();
  });
});
