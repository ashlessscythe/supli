import { beforeEach, describe, expect, it, vi } from "vitest";
import { RequestStatus, StockMovementType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requestService } from "@/server/services/request.service";
import { requestRepository } from "@/server/repositories/request.repository";
import { supplyRepository } from "@/server/repositories/supply.repository";
import { locationRepository } from "@/server/repositories/location.repository";
import { stockLevelRepository } from "@/server/repositories/stock-level.repository";
import { settingsService } from "@/server/services/settings.service";
import { notificationService } from "@/server/services/notification.service";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
  },
}));

vi.mock("@/server/repositories/request.repository", () => ({
  requestRepository: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    updateStatus: vi.fn(),
  },
}));

vi.mock("@/server/repositories/supply.repository", () => ({
  supplyRepository: {
    findById: vi.fn(),
  },
}));

vi.mock("@/server/repositories/location.repository", () => ({
  locationRepository: {
    findDefault: vi.fn(),
  },
}));

vi.mock("@/server/repositories/stock-level.repository", () => ({
  stockLevelRepository: {
    syncSupplyTotals: vi.fn(),
  },
}));

vi.mock("@/server/services/settings.service", () => ({
  settingsService: {
    shouldShowAllRequests: vi.fn(),
  },
}));

vi.mock("@/server/services/notification.service", () => ({
  notificationService: {
    notifyRequestStatus: vi.fn(),
    notifyAdminsLowStock: vi.fn(),
  },
}));

// create remains available via the API/server action; the Inbound UI no longer
// exposes staff create-request. Admin approve/deny is the supported UI path.
describe("requestService.create", () => {
  const actorId = "user-1";
  const supply = {
    id: "supply-1",
    name: "Nitrile gloves",
    quantity: 10,
  };

  const tx = {
    auditLog: { create: vi.fn() },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.$transaction).mockImplementation(async (operation) =>
      operation(tx as never)
    );
  });

  it("rejects when supply is not found", async () => {
    vi.mocked(supplyRepository.findById).mockResolvedValue(null as never);

    const result = await requestService.create(actorId, {
      supplyId: "missing",
      quantity: 1,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Supply not found");
    }
  });

  it("rejects when requested quantity exceeds available stock", async () => {
    vi.mocked(supplyRepository.findById).mockResolvedValue(supply as never);

    const result = await requestService.create(actorId, {
      supplyId: supply.id,
      quantity: 11,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Requested quantity exceeds available stock");
    }
  });

  it("creates a pending request when stock is available", async () => {
    const created = { id: "req-1", quantity: 3, status: RequestStatus.PENDING };
    vi.mocked(supplyRepository.findById).mockResolvedValue(supply as never);
    vi.mocked(requestRepository.create).mockResolvedValue(created as never);

    const result = await requestService.create(actorId, {
      supplyId: supply.id,
      quantity: 3,
    });

    expect(result.success).toBe(true);
    expect(requestRepository.create).toHaveBeenCalledWith(
      {
        userId: actorId,
        supplyId: supply.id,
        quantity: 3,
      },
      tx
    );
    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: {
        userId: actorId,
        action: "Created request for 3 Nitrile gloves",
      },
    });
  });
});

describe("requestService.updateStatus", () => {
  const actorId = "admin-1";
  const location = { id: "location-1", name: "Main stockroom" };
  const existing = {
    id: "req-1",
    userId: "user-1",
    supplyId: "supply-1",
    quantity: 5,
    status: RequestStatus.PENDING,
    supply: {
      id: "supply-1",
      name: "Nitrile gloves",
      quantity: 20,
      minimumThreshold: 5,
    },
  };

  const tx = {
    auditLog: { create: vi.fn() },
    stockLevel: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    stockMovement: {
      create: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.$transaction).mockImplementation(async (operation) =>
      operation(tx as never)
    );
    vi.mocked(requestRepository.findById).mockResolvedValue(existing as never);
    vi.mocked(locationRepository.findDefault).mockResolvedValue(
      location as never
    );
    tx.stockLevel.findUnique.mockResolvedValue({
      supplyId: existing.supplyId,
      locationId: location.id,
      quantity: 20,
    });
    vi.mocked(stockLevelRepository.syncSupplyTotals).mockResolvedValue({
      ...existing.supply,
      quantity: 15,
    } as never);
    vi.mocked(requestRepository.updateStatus).mockResolvedValue({
      ...existing,
      status: RequestStatus.APPROVED,
    } as never);
  });

  it("rejects invalid status values", async () => {
    const result = await requestService.updateStatus(
      actorId,
      existing.id,
      RequestStatus.PENDING
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Invalid status");
    }
  });

  it("rejects when request was already processed", async () => {
    vi.mocked(requestRepository.findById).mockResolvedValue({
      ...existing,
      status: RequestStatus.APPROVED,
    } as never);

    const result = await requestService.updateStatus(
      actorId,
      existing.id,
      RequestStatus.DENIED
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Request has already been processed");
    }
  });

  it("rejects approval when supply quantity is insufficient", async () => {
    vi.mocked(requestRepository.findById).mockResolvedValue({
      ...existing,
      quantity: 25,
      supply: { ...existing.supply, quantity: 20 },
    } as never);

    const result = await requestService.updateStatus(
      actorId,
      existing.id,
      RequestStatus.APPROVED
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Insufficient supply quantity");
    }
  });

  it("approves request, deducts stock, and notifies the requester", async () => {
    const result = await requestService.updateStatus(
      actorId,
      existing.id,
      RequestStatus.APPROVED
    );

    expect(result.success).toBe(true);
    expect(tx.stockLevel.update).toHaveBeenCalledWith({
      where: {
        supplyId_locationId: {
          supplyId: existing.supplyId,
          locationId: location.id,
        },
      },
      data: { quantity: { decrement: existing.quantity } },
    });
    expect(tx.stockMovement.create).toHaveBeenCalledWith({
      data: {
        supplyId: existing.supplyId,
        locationId: location.id,
        quantity: existing.quantity,
        type: StockMovementType.CONSUME,
        userId: actorId,
        notes: `Request approved for user ${existing.userId}`,
      },
    });
    expect(stockLevelRepository.syncSupplyTotals).toHaveBeenCalledWith(
      existing.supplyId,
      tx
    );
    expect(notificationService.notifyRequestStatus).toHaveBeenCalledWith(
      existing.userId,
      existing.supply.name,
      RequestStatus.APPROVED,
      existing.id
    );
  });

  it("denies request without touching stock levels", async () => {
    vi.mocked(requestRepository.updateStatus).mockResolvedValue({
      ...existing,
      status: RequestStatus.DENIED,
    } as never);

    const result = await requestService.updateStatus(
      actorId,
      existing.id,
      RequestStatus.DENIED
    );

    expect(result.success).toBe(true);
    expect(tx.stockLevel.update).not.toHaveBeenCalled();
    expect(tx.stockMovement.create).not.toHaveBeenCalled();
    expect(notificationService.notifyRequestStatus).toHaveBeenCalledWith(
      existing.userId,
      existing.supply.name,
      RequestStatus.DENIED,
      existing.id
    );
  });

  it("alerts admins when approval leaves supply at or below threshold", async () => {
    vi.mocked(requestRepository.findById).mockResolvedValue({
      ...existing,
      quantity: 16,
      supply: { ...existing.supply, quantity: 20, minimumThreshold: 5 },
    } as never);
    vi.mocked(stockLevelRepository.syncSupplyTotals).mockResolvedValue({
      ...existing.supply,
      quantity: 4,
      minimumThreshold: 5,
    } as never);

    await requestService.updateStatus(
      actorId,
      existing.id,
      RequestStatus.APPROVED
    );

    expect(notificationService.notifyAdminsLowStock).toHaveBeenCalledWith(
      existing.supply.name,
      4,
      existing.supplyId
    );
  });

  it("rejects approval when no default location is configured", async () => {
    vi.mocked(locationRepository.findDefault).mockResolvedValue(null as never);

    const result = await requestService.updateStatus(
      actorId,
      existing.id,
      RequestStatus.APPROVED
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("No location configured");
    }
    expect(tx.stockLevel.update).not.toHaveBeenCalled();
  });

  it("rejects when default location stock is below request even if global qty is enough", async () => {
    tx.stockLevel.findUnique.mockResolvedValue({
      supplyId: existing.supplyId,
      locationId: location.id,
      quantity: 2,
    });

    const result = await requestService.updateStatus(
      actorId,
      existing.id,
      RequestStatus.APPROVED
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Insufficient stock at default location");
    }
    expect(tx.stockLevel.update).not.toHaveBeenCalled();
  });
});

describe("requestService.getById", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("scopes staff lookups to their own requests when setting is off", async () => {
    vi.mocked(settingsService.shouldShowAllRequests).mockResolvedValue(false);
    vi.mocked(requestRepository.findFirst).mockResolvedValue(null as never);

    const result = await requestService.getById("user-1", "STAFF", "req-other");

    expect(requestRepository.findFirst).toHaveBeenCalledWith({
      id: "req-other",
      userId: "user-1",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Request not found");
    }
  });

  it("allows admins to read any request id", async () => {
    const request = { id: "req-1", userId: "other" };
    vi.mocked(settingsService.shouldShowAllRequests).mockResolvedValue(false);
    vi.mocked(requestRepository.findFirst).mockResolvedValue(request as never);

    const result = await requestService.getById("admin-1", "ADMIN", "req-1");

    expect(requestRepository.findFirst).toHaveBeenCalledWith({ id: "req-1" });
    expect(result.success).toBe(true);
  });
});

describe("requestService.list", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("scopes non-admin users to their own requests when setting is off", async () => {
    vi.mocked(settingsService.shouldShowAllRequests).mockResolvedValue(false);
    vi.mocked(requestRepository.findMany).mockResolvedValue([] as never);

    await requestService.list("user-1", "STAFF");

    expect(requestRepository.findMany).toHaveBeenCalledWith({ userId: "user-1" });
  });

  it("returns all requests for admins", async () => {
    vi.mocked(settingsService.shouldShowAllRequests).mockResolvedValue(false);
    vi.mocked(requestRepository.findMany).mockResolvedValue([] as never);

    await requestService.list("admin-1", "ADMIN");

    expect(requestRepository.findMany).toHaveBeenCalledWith({});
  });
});
