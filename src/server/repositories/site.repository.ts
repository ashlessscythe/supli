import { prisma } from "@/lib/prisma";
import type { TransactionClient } from "@/server/audit";
import { kioskUsernameForSlug } from "@/lib/sites";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { Role } from "@prisma/client";

export const siteRepository = {
  findAll() {
    return prisma.site.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: {
            users: true,
            supplies: true,
            locations: true,
            vendors: true,
          },
        },
      },
    });
  },

  findActive() {
    return prisma.site.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true },
    });
  },

  findById(id: string) {
    return prisma.site.findUnique({ where: { id } });
  },

  findBySlug(slug: string) {
    return prisma.site.findUnique({ where: { slug } });
  },

  async create(
    data: { name: string; slug: string; isActive?: boolean },
    tx?: TransactionClient
  ) {
    const client = tx ?? prisma;
    const defaultPinHash = await bcrypt.hash("kiosk1234", 10);
    const site = await client.site.create({
      data: {
        name: data.name,
        slug: data.slug,
        isActive: data.isActive ?? true,
        kioskPasswordHash: defaultPinHash,
      },
    });

    await client.user.create({
      data: {
        username: kioskUsernameForSlug(site.slug),
        password: await bcrypt.hash(crypto.randomBytes(24).toString("hex"), 10),
        role: Role.STAFF,
        siteId: site.id,
      },
    });

    const defaultSettings = [
      {
        key: "ALLOW_ALL_REQUESTS_VISIBLE",
        value: "false",
        description: "Allow all users to see all requests (not just their own)",
      },
      {
        key: "LOW_STOCK_THRESHOLD_WARNING",
        value: "5",
        description: "Global minimum threshold for low stock warnings",
      },
      {
        key: "MAX_REQUEST_QUANTITY",
        value: "100",
        description: "Maximum quantity allowed per request",
      },
    ];

    for (const setting of defaultSettings) {
      await client.systemSetting.create({
        data: { siteId: site.id, ...setting },
      });
    }

    return site;
  },

  update(
    id: string,
    data: Partial<{
      name: string;
      slug: string;
      isActive: boolean;
      kioskPasswordHash: string;
    }>,
    tx?: TransactionClient
  ) {
    const client = tx ?? prisma;
    return client.site.update({ where: { id }, data });
  },

  delete(id: string, tx?: TransactionClient) {
    const client = tx ?? prisma;
    return client.site.delete({ where: { id } });
  },
};
