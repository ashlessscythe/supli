import { z } from "zod";
import { Role } from "@prisma/client";
import { failure, success } from "@/lib/result";
import {
  isKioskUsername,
  kioskUsernameForSlug,
  MAIN_SITE_SLUG,
} from "@/lib/sites";
import { executeWithAudit, recordAudit } from "@/server/audit";
import { prisma } from "@/lib/prisma";
import { siteRepository } from "@/server/repositories/site.repository";
import { userRepository } from "@/server/repositories/user.repository";

const slugSchema = z
  .string()
  .min(1)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Slug must be lowercase alphanumeric with hyphens"
  );

const siteCreateSchema = z.object({
  name: z.string().min(1),
  slug: slugSchema,
  isActive: z.boolean().optional(),
});

const siteUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  slug: slugSchema.optional(),
  isActive: z.boolean().optional(),
});

const assignRoleSchema = z.enum([Role.ADMIN, Role.STAFF, Role.PENDING]);

export const siteService = {
  async list() {
    try {
      const sites = await siteRepository.findAll();
      return success(sites);
    } catch {
      return failure("Failed to fetch sites");
    }
  },

  async listActive() {
    try {
      const sites = await siteRepository.findActive();
      return success(sites);
    } catch {
      return failure("Failed to fetch active sites");
    }
  },

  async getById(id: string) {
    try {
      const site = await siteRepository.findById(id);
      if (!site) return failure("Site not found");
      return success(site);
    } catch {
      return failure("Failed to fetch site");
    }
  },

  async create(
    actorId: string,
    input: { name: string; slug: string; isActive?: boolean }
  ) {
    try {
      const data = siteCreateSchema.parse(input);

      const existing = await siteRepository.findBySlug(data.slug);
      if (existing) return failure("A site with that slug already exists");

      const site = await prisma.$transaction(async (tx) => {
        const created = await siteRepository.create(data, tx);
        await recordAudit(
          actorId,
          `Created site: ${data.name}`,
          tx,
          created.id
        );
        return created;
      });

      return success(site);
    } catch (error) {
      if (error instanceof z.ZodError) return failure(error.errors);
      return failure("Failed to create site");
    }
  },

  async update(
    actorId: string,
    id: string,
    fields: { name?: string; slug?: string; isActive?: boolean }
  ) {
    try {
      const data = siteUpdateSchema.parse(fields);
      const existing = await siteRepository.findById(id);
      if (!existing) return failure("Site not found");

      if (data.slug && data.slug !== existing.slug) {
        const slugTaken = await siteRepository.findBySlug(data.slug);
        if (slugTaken) return failure("A site with that slug already exists");
      }

      const site = await executeWithAudit(
        actorId,
        `Updated site: ${data.name ?? existing.name}`,
        async (tx) => {
          const updated = await siteRepository.update(id, data, tx);

          if (data.slug && data.slug !== existing.slug) {
            const kioskUser = await tx.user.findUnique({
              where: { username: kioskUsernameForSlug(existing.slug) },
            });
            if (kioskUser) {
              await userRepository.update(
                kioskUser.id,
                { username: kioskUsernameForSlug(data.slug) },
                tx
              );
            }
          }

          return updated;
        },
        id
      );

      return success(site);
    } catch (error) {
      if (error instanceof z.ZodError) return failure(error.errors);
      return failure("Failed to update site");
    }
  },

  async delete(actorId: string, id: string) {
    try {
      const site = await siteRepository.findById(id);
      if (!site) return failure("Site not found");

      const sites = await siteRepository.findAll();
      if (sites.length <= 1) {
        return failure("Cannot delete the only site");
      }
      if (site.slug === MAIN_SITE_SLUG) {
        return failure("Cannot delete the main site");
      }

      await executeWithAudit(
        actorId,
        `Deleted site: ${site.name}`,
        (tx) => siteRepository.delete(id, tx),
        id
      );

      return success({ success: true });
    } catch {
      return failure("Failed to delete site");
    }
  },

  async assignUser(
    actorId: string,
    userId: string,
    siteId: string,
    role?: "ADMIN" | "STAFF" | "PENDING"
  ) {
    try {
      const site = await siteRepository.findById(siteId);
      if (!site) return failure("Site not found");

      const user = await userRepository.findById(userId);
      if (!user) return failure("User not found");

      if (user.role === Role.SUPERADMIN) {
        return failure("Cannot assign SUPERADMIN to a site");
      }
      if (isKioskUsername(user.username)) {
        return failure("Cannot move kiosk users between sites");
      }

      const parsedRole = role ? assignRoleSchema.parse(role) : undefined;

      const updated = await executeWithAudit(
        actorId,
        `Assigned user ${user.username} to site ${site.slug}`,
        (tx) =>
          userRepository.update(
            userId,
            {
              siteId,
              ...(parsedRole ? { role: parsedRole } : {}),
            },
            tx
          ),
        siteId
      );

      return success(updated);
    } catch (error) {
      if (error instanceof z.ZodError) return failure(error.errors);
      return failure("Failed to assign user to site");
    }
  },
};
