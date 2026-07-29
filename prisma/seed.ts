const {
  PrismaClient,
  Role,
  StockMovementType,
  VendorReorderStatus,
} = require("@prisma/client");
const { faker } = require("@faker-js/faker");
const bcrypt = require("bcrypt");
const nodeCrypto = require("crypto");
const yargs = require("yargs/yargs");
const { hideBin } = require("yargs/helpers");

const prisma = new PrismaClient();

// Keep in sync with src/lib/sites.ts (CommonJS seed cannot import that module cleanly).
const MAIN_SITE_SLUG = "main";
const MAIN_SITE_NAME = "Main";

// Crockford-style alphabet (no ambiguous 0/O/1/I) for good-looking barcodes.
const BARCODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomBarcodeGroup(length: number) {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += BARCODE_ALPHABET[Math.floor(Math.random() * BARCODE_ALPHABET.length)];
  }
  return out;
}

// Canonical stored barcode: uppercase alphanumeric, no separators.
// Dashes are added only for display in the app (see src/lib/barcode.ts).
function normalizeBarcode(raw: string) {
  return String(raw ?? "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

// Generates a canonical (dash-free) code, e.g. "7K2QXB4M9AZ3".
function generateBarcode() {
  return `${randomBarcodeGroup(4)}${randomBarcodeGroup(4)}${randomBarcodeGroup(4)}`;
}

// barcode is unique per site, so guard against both in-memory and DB collisions.
async function generateUniqueBarcode(used: Set<string>, siteId: string) {
  let code = generateBarcode();
  while (
    used.has(code) ||
    (await prisma.supply.findFirst({ where: { siteId, barcode: code } }))
  ) {
    code = generateBarcode();
  }
  used.add(code);
  return code;
}

// Parse command line arguments
const argv = yargs(hideBin(process.argv))
  .option("use-faker", {
    type: "boolean",
    description: "Generate additional randomized demo data (non-deterministic)",
    default: false,
  })
  .option("clear", {
    type: "boolean",
    description: "Clear all data before seeding",
    default: false,
  })
  .option("settings-only", {
    type: "boolean",
    description: "Only update system settings",
    default: false,
  })
  .option("count", {
    type: "number",
    description: "Number of users to create",
    default: 10,
  })
  .option("products", {
    type: "number",
    description: "Number of products to create",
    default: 20,
  })
  .option("orders", {
    type: "number",
    description: "Number of open vendor orders to create (faker path)",
    default: 12,
  })
  .help().argv;

async function clearDatabase() {
  if (argv.clear) {
    console.log("🗑️  Clearing database...");
    // Delete in correct order to respect foreign key constraints
    await prisma.stockMovement.deleteMany();
    await prisma.itemVendor.deleteMany();
    await prisma.stockLevel.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.fileAttachment.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.request.deleteMany();
    await prisma.vendorReorder.deleteMany();
    await prisma.supply.deleteMany();
    await prisma.vendor.deleteMany();
    await prisma.location.deleteMany();
    await prisma.itemType.deleteMany();
    await prisma.systemSetting.deleteMany();
    await prisma.user.deleteMany();
    await prisma.site.deleteMany();
    console.log("✓ Database cleared");
  }
}

async function ensureMainSite() {
  const kioskPasswordHash = await bcrypt.hash("kiosk1234", 10);
  const existing = await prisma.site.findUnique({
    where: { slug: MAIN_SITE_SLUG },
  });

  if (existing) {
    const site = await prisma.site.update({
      where: { id: existing.id },
      data: {
        name: MAIN_SITE_NAME,
        isActive: true,
        kioskPasswordHash: existing.kioskPasswordHash ?? kioskPasswordHash,
      },
    });
    console.log(`✓ Main site ensured (${site.slug})`);
    return site;
  }

  const site = await prisma.site.create({
    data: {
      name: MAIN_SITE_NAME,
      slug: MAIN_SITE_SLUG,
      isActive: true,
      kioskPasswordHash,
    },
  });
  console.log(`✓ Main site ensured (${site.slug})`);
  return site;
}

async function ensureSuperAdmin() {
  const email = process.env.SUPERADMIN_EMAIL?.trim();
  if (!email) return;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: { role: Role.SUPERADMIN, siteId: null },
    });
    console.log(`✓ Superadmin role ensured for ${email}`);
    return;
  }

  const initialPassword = process.env.SUPERADMIN_INITIAL_PASSWORD;
  if (!initialPassword) {
    console.warn(
      "SUPERADMIN_EMAIL is set but SUPERADMIN_INITIAL_PASSWORD is missing; skipping superadmin creation"
    );
    return;
  }

  const localPart = email.split("@")[0] ?? "superadmin";
  const username =
    localPart.replace(/[^a-zA-Z0-9._-]/g, "").toLowerCase() || "superadmin";

  await prisma.user.create({
    data: {
      username,
      email,
      emailVerified: new Date(),
      password: await bcrypt.hash(initialPassword, 10),
      role: Role.SUPERADMIN,
      siteId: null,
    },
  });
  console.log(`✓ Superadmin created for ${email}`);
}

async function createDefaultUsers(siteId: string) {
  // Armored Core VI handlers & mercs. Admin-role users are handlers/command;
  // staff-role users are contracted Ravens (independent mercenaries).
  const defaultUsers = [
    {
      username: "walter", // Handler Walter — issues contracts, oversees ops
      password: "admin123",
      email: "walter@supli.local",
      role: Role.ADMIN,
    },
    {
      username: "carla", // Chief Carla — RaD, keeps the shop running
      password: "admin123",
      email: "carla@supli.local",
      role: Role.ADMIN,
    },
    {
      username: "raven", // 621 — the augmented merc
      password: "staff123",
      email: "raven@supli.local",
      role: Role.STAFF,
    },
    {
      username: "rusty", // Steel Haze — Vespa/Vesper AC pilot
      password: "staff123",
      email: "rusty@supli.local",
      role: Role.STAFF,
    },
    {
      username: "iguazu", // G5 Iguazu — perpetually one step behind
      password: "staff123",
      email: "iguazu@supli.local",
      role: Role.STAFF,
    },
  ];

  for (const user of defaultUsers) {
    const hashedPassword = await bcrypt.hash(user.password, 10);
    await prisma.user.upsert({
      where: { username: user.username },
      update: {
        email: user.email,
        emailVerified: new Date(),
        siteId,
      },
      create: {
        username: user.username,
        email: user.email,
        emailVerified: new Date(),
        password: hashedPassword,
        role: user.role,
        siteId,
      },
    });
  }

  // Dedicated kiosk system user for the main site. Kiosk consumption is
  // attributed to this user for the audit trail. It is not meant to be logged
  // into directly, so it gets a random, unknown password.
  await prisma.user.upsert({
    where: { username: "kiosk-main" },
    update: { siteId },
    create: {
      username: "kiosk-main",
      password: await bcrypt.hash(
        nodeCrypto.randomBytes(24).toString("hex"),
        10
      ),
      role: Role.STAFF,
      siteId,
    },
  });

  console.log("✓ Default users created");
}

async function createDefaultSettings(siteId: string) {
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
    {
      key: "SITE_TIMEZONE",
      value: "UTC",
      description:
        "IANA timezone used when displaying dates and times across the app",
    },
  ];

  for (const setting of defaultSettings) {
    await prisma.systemSetting.upsert({
      where: { siteId_key: { siteId, key: setting.key } },
      update: {},
      create: { siteId, ...setting },
    });
  }

  console.log("✓ Default system settings created");
}

async function createDefaultItemTypes(siteId: string) {
  const itemTypes = [
    {
      slug: "frame",
      name: "Frame Parts",
      description: "AC frame units: heads, cores, arms and legs",
    },
    {
      slug: "inner",
      name: "Inner Parts",
      description: "Boosters, FCS units and generators",
    },
    {
      slug: "armament",
      name: "Armaments",
      description: "Arm and back weapons for Armored Cores",
    },
  ];

  for (const itemType of itemTypes) {
    await prisma.itemType.upsert({
      where: { siteId_slug: { siteId, slug: itemType.slug } },
      update: {
        name: itemType.name,
        description: itemType.description,
      },
      create: { siteId, ...itemType },
    });
  }

  console.log("✓ Default item types created");
}

async function createDefaultLocations(siteId: string) {
  // Mission destinations on Rubicon 3.
  const locations = [
    {
      name: "Watchpoint Delta",
      type: "Combat Zone",
      description: "The Wall installation guarding the contaminated zone",
    },
    {
      name: "Xylem",
      type: "Floating City",
      description: "Arquebus Corporation's airborne stronghold",
    },
    {
      name: "Rubicon Research Institute",
      type: "Restricted Facility",
      description: "Deep Coral research site in the Institute City ruins",
    },
  ];

  for (const location of locations) {
    // name is unique per site, so upsert keeps this idempotent
    await prisma.location.upsert({
      where: { siteId_name: { siteId, name: location.name } },
      update: {
        type: location.type,
        description: location.description,
        isActive: true,
      },
      create: { siteId, ...location },
    });
  }

  // Retire the pre-AC default locations (incl. the migration's "Main Office")
  // so only the three mission destinations remain active.
  await prisma.location.updateMany({
    where: {
      siteId,
      name: { in: ["Main Office", "Central Warehouse", "Storage Room A"] },
    },
    data: { isActive: false },
  });

  console.log("✓ Default locations created");
}

async function createDefaultVendors(siteId: string) {
  // Corporations & mercenary groups operating on Rubicon 3.
  const vendors = [
    {
      name: "Balam Industries",
      contact: "procurement@balam.example.com",
      website: "https://balam.example.com",
      notes: "Corporate mining & MT manufacturer; backs the Redguns",
    },
    {
      name: "Arquebus Corporation",
      contact: "logistics@arquebus.example.com",
      website: "https://arquebus.example.com",
      notes: "Corporate Coral research; fields the Vespers",
    },
    {
      name: "Rubicon Liberation Front",
      contact: "quartermaster@rlf.example.com",
      website: "https://rlf.example.com",
      notes: "Rubiconian insurgents; salvaged and legacy gear",
    },
    {
      name: "Redguns",
      contact: "supply@redguns.example.com",
      website: "https://redguns.example.com",
      notes: "Balam's independent mercenary squadron",
    },
    {
      name: "Vespers",
      contact: "armory@vespers.example.com",
      website: "https://vespers.example.com",
      notes: "Arquebus's elite AC squadron",
    },
    {
      name: "The Association",
      contact: "contracts@association.example.com",
      website: "https://association.example.com",
      notes: "Independent Raven registry and open-market parts",
    },
  ];

  for (const vendor of vendors) {
    // Vendor.name is not unique in the schema, so guard by name+siteId
    const existing = await prisma.vendor.findFirst({
      where: { name: vendor.name, siteId },
    });
    if (existing) {
      await prisma.vendor.update({
        where: { id: existing.id },
        data: vendor,
      });
    } else {
      await prisma.vendor.create({ data: { siteId, ...vendor } });
    }
  }

  console.log("✓ Default vendors created");
}

async function createDefaultSupplies(siteId: string) {
  const [itemTypes, locations, vendors] = await Promise.all([
    prisma.itemType.findMany({ where: { siteId } }),
    prisma.location.findMany({ where: { siteId } }),
    prisma.vendor.findMany({ where: { siteId } }),
  ]);

  const itemTypeBySlug = Object.fromEntries(
    itemTypes.map((t: { slug: string; id: string }) => [t.slug, t.id])
  );
  const locationByName = Object.fromEntries(
    locations.map((l: { name: string; id: string }) => [l.name, l.id])
  );
  const vendorByName = Object.fromEntries(
    vendors.map((v: { name: string; id: string }) => [v.name, v.id])
  );

  // 15 Armored Core VI parts. `stock` maps locationName -> qty; `vendors` maps
  // a merc/corp group to per-supplier terms. Barcodes are readable here but are
  // stored canonically (dashes stripped) and re-formatted for display.
  const defaultSupplies = [
    {
      name: "Balam Head Unit",
      description:
        "Balam standard head unit. Reliable all-rounder. (HD-011 MELANDER)",
      quantity: 12,
      minimumThreshold: 4,
      barcode: "HDML-4NDR-8K23",
      internalSku: "AC-HD011-MEL",
      itemTypeSlug: "frame",
      stock: { "Watchpoint Delta": 8, Xylem: 4 },
      vendors: [
        {
          name: "Balam Industries",
          vendorSku: "BLM-HD011",
          isPreferred: true,
          leadTimeDays: 3,
          moq: 2,
          cost: 72000,
        },
        {
          name: "Redguns",
          vendorSku: "RG-HD011",
          isPreferred: false,
          leadTimeDays: 5,
          moq: 1,
          cost: 75000,
        },
      ],
    },
    {
      name: "Balam Core Unit",
      description:
        "Balam standard core. Balanced output and armor. (BD-011 MELANDER)",
      quantity: 10,
      minimumThreshold: 4,
      barcode: "BDML-4NDR-6T94",
      internalSku: "AC-BD011-MEL",
      itemTypeSlug: "frame",
      stock: { "Watchpoint Delta": 6, Xylem: 4 },
      vendors: [
        {
          name: "Balam Industries",
          vendorSku: "BLM-BD011",
          isPreferred: true,
          leadTimeDays: 3,
          moq: 2,
          cost: 133000,
        },
        {
          name: "Redguns",
          vendorSku: "RG-BD011",
          isPreferred: false,
          leadTimeDays: 5,
          moq: 1,
          cost: 138000,
        },
      ],
    },
    {
      name: "Balam Arm Unit",
      description:
        "Balam standard arms. Steady aim, solid carry. (AR-011 MELANDER)",
      quantity: 9,
      minimumThreshold: 3,
      barcode: "ARML-4NDR-3W72",
      internalSku: "AC-AR011-MEL",
      itemTypeSlug: "frame",
      stock: { "Watchpoint Delta": 5, Xylem: 4 },
      vendors: [
        {
          name: "Balam Industries",
          vendorSku: "BLM-AR011",
          isPreferred: true,
          leadTimeDays: 3,
          moq: 2,
          cost: 98000,
        },
      ],
    },
    {
      name: "Balam Leg Unit",
      description:
        "Balam standard bipedal legs. Dependable load rating. (LG-011 MELANDER)",
      quantity: 8,
      minimumThreshold: 3,
      barcode: "LGML-4NDR-9H58",
      internalSku: "AC-LG011-MEL",
      itemTypeSlug: "frame",
      stock: { "Watchpoint Delta": 5, Xylem: 3 },
      vendors: [
        {
          name: "Balam Industries",
          vendorSku: "BLM-LG011",
          isPreferred: true,
          leadTimeDays: 3,
          moq: 2,
          cost: 91000,
        },
      ],
    },
    {
      name: "Schneider Head Unit",
      description:
        "Schneider lightweight head. High stability, low weight. (NACHTREIHER/44E)",
      quantity: 7,
      minimumThreshold: 3,
      barcode: "N4CH-TR44-EK2D",
      internalSku: "AC-NACHT-44E-HD",
      itemTypeSlug: "frame",
      stock: { Xylem: 5, "Watchpoint Delta": 2 },
      vendors: [
        {
          name: "Arquebus Corporation",
          vendorSku: "ARQ-NACHT44E",
          isPreferred: true,
          leadTimeDays: 4,
          moq: 1,
          cost: 84000,
        },
        {
          name: "Vespers",
          vendorSku: "VSP-NACHT44E",
          isPreferred: false,
          leadTimeDays: 6,
          moq: 1,
          cost: 88000,
        },
      ],
    },
    {
      name: "Arquebus Core Unit",
      description:
        "Arquebus Vesper core. Tuned for energy weapons. (VP-40S)",
      quantity: 6,
      minimumThreshold: 3,
      barcode: "VP4S-KRWM-5T83",
      internalSku: "AC-VP40S-CR",
      itemTypeSlug: "frame",
      stock: { Xylem: 6 },
      vendors: [
        {
          name: "Arquebus Corporation",
          vendorSku: "ARQ-VP40S",
          isPreferred: true,
          leadTimeDays: 5,
          moq: 1,
          cost: 174000,
        },
        {
          name: "Vespers",
          vendorSku: "VSP-VP40S",
          isPreferred: false,
          leadTimeDays: 7,
          moq: 1,
          cost: 179000,
        },
      ],
    },
    {
      name: "Arquebus Arm Unit",
      description:
        "Arquebus Vesper arms. Precision energy-arm platform. (VP-46S)",
      quantity: 5,
      minimumThreshold: 3,
      barcode: "VP46-ARMZ-7D24",
      internalSku: "AC-VP46S-AR",
      itemTypeSlug: "frame",
      stock: { Xylem: 5 },
      vendors: [
        {
          name: "Vespers",
          vendorSku: "VSP-VP46S",
          isPreferred: true,
          leadTimeDays: 5,
          moq: 1,
          cost: 121000,
        },
        {
          name: "Arquebus Corporation",
          vendorSku: "ARQ-VP46S",
          isPreferred: false,
          leadTimeDays: 6,
          moq: 1,
          cost: 118000,
        },
      ],
    },
    {
      name: "Schneider Reverse-Joint Legs",
      description:
        "Schneider reverse-joint legs. Excellent jump kinematics. (KASUAR/42Z)",
      quantity: 4,
      minimumThreshold: 5,
      barcode: "K4SU-4R42-ZN63",
      internalSku: "AC-KASUAR-42Z",
      itemTypeSlug: "frame",
      stock: { Xylem: 4 },
      vendors: [
        {
          name: "Arquebus Corporation",
          vendorSku: "ARQ-KASUAR42Z",
          isPreferred: true,
          leadTimeDays: 6,
          moq: 1,
          cost: 126000,
        },
      ],
    },
    {
      name: "Schneider Booster",
      description:
        "Schneider booster. Strong quick-boost thrust. (ALULA/21E)",
      quantity: 14,
      minimumThreshold: 5,
      barcode: "4LUL-4B22-EK95",
      internalSku: "AC-ALULA-21E",
      itemTypeSlug: "inner",
      stock: { "Watchpoint Delta": 8, Xylem: 6 },
      vendors: [
        {
          name: "Arquebus Corporation",
          vendorSku: "ARQ-ALULA21E",
          isPreferred: true,
          leadTimeDays: 4,
          moq: 2,
          cost: 61000,
        },
        {
          name: "Vespers",
          vendorSku: "VSP-ALULA21E",
          isPreferred: false,
          leadTimeDays: 6,
          moq: 1,
          cost: 64000,
        },
      ],
    },
    {
      name: "RaD Fire-Control System",
      description:
        "RaD fire-control system. Great mid-range assist. (FCS-G2/P05)",
      quantity: 11,
      minimumThreshold: 4,
      barcode: "FCSG-2P25-W7H4",
      internalSku: "AC-FCS-G2P05",
      itemTypeSlug: "inner",
      stock: { "Watchpoint Delta": 7, "Rubicon Research Institute": 4 },
      vendors: [
        {
          name: "The Association",
          vendorSku: "ASC-FCSG2P05",
          isPreferred: true,
          leadTimeDays: 4,
          moq: 2,
          cost: 51000,
        },
      ],
    },
    {
      name: "Takigawa Generator",
      description:
        "Takigawa generator. High capacity, steady supply. (AG-J-098 JOSO)",
      quantity: 9,
      minimumThreshold: 4,
      barcode: "AGJ9-8GEN-5T2W",
      internalSku: "AC-AGJ098-JOSO",
      itemTypeSlug: "inner",
      stock: { "Watchpoint Delta": 5, "Rubicon Research Institute": 4 },
      vendors: [
        {
          name: "The Association",
          vendorSku: "ASC-JOSO098",
          isPreferred: true,
          leadTimeDays: 5,
          moq: 1,
          cost: 143000,
        },
      ],
    },
    {
      name: "Dafeng Generator",
      description:
        "Dafeng generator. Fast EN recovery for aggressive builds. (DF-GN-06 MING-TANG)",
      quantity: 6,
      minimumThreshold: 3,
      barcode: "DFGN-M2NG-T4K8",
      internalSku: "AC-DFGN06-MING",
      itemTypeSlug: "inner",
      stock: { "Rubicon Research Institute": 6 },
      vendors: [
        {
          name: "Rubicon Liberation Front",
          vendorSku: "RLF-MINGTANG",
          isPreferred: true,
          leadTimeDays: 8,
          moq: 1,
          cost: 156000,
        },
      ],
    },
    {
      name: "RaD Assault Rifle",
      description:
        "RaD assault rifle. Workhorse kinetic sidearm. (RF-024 TURNER)",
      quantity: 20,
      minimumThreshold: 6,
      barcode: "RF24-TRNR-9W53",
      internalSku: "AC-RF024-TURN",
      itemTypeSlug: "armament",
      stock: { "Watchpoint Delta": 12, Xylem: 8 },
      vendors: [
        {
          name: "The Association",
          vendorSku: "ASC-RF024",
          isPreferred: true,
          leadTimeDays: 3,
          moq: 4,
          cost: 39000,
        },
        {
          name: "Redguns",
          vendorSku: "RG-RF024",
          isPreferred: false,
          leadTimeDays: 4,
          moq: 2,
          cost: 41000,
        },
      ],
    },
    {
      name: "RaD Shotgun",
      description:
        "RaD shotgun. Devastating stagger damage up close. (SG-027 ZIMMERMAN)",
      quantity: 15,
      minimumThreshold: 5,
      barcode: "SG27-Z2MM-RN84",
      internalSku: "AC-SG027-ZIMM",
      itemTypeSlug: "armament",
      stock: { "Watchpoint Delta": 9, Xylem: 6 },
      vendors: [
        {
          name: "The Association",
          vendorSku: "ASC-SG027",
          isPreferred: true,
          leadTimeDays: 4,
          moq: 2,
          cost: 92000,
        },
      ],
    },
    {
      name: "Coral Laser Blade",
      description:
        "Coral laser blade (legacy). Rare — issue with caution. (IA-C01W2: MOONLIGHT)",
      quantity: 2,
      minimumThreshold: 3,
      barcode: "M2NL-GHT4-K7D3",
      internalSku: "AC-IAC01W2-MOON",
      itemTypeSlug: "armament",
      stock: { "Rubicon Research Institute": 2 },
      vendors: [
        {
          name: "Rubicon Liberation Front",
          vendorSku: "RLF-MOONLIGHT",
          isPreferred: true,
          leadTimeDays: 14,
          moq: 1,
          cost: 320000,
        },
        {
          name: "Arquebus Corporation",
          vendorSku: "ARQ-MOONLIGHT",
          isPreferred: false,
          leadTimeDays: 20,
          moq: 1,
          cost: 340000,
        },
      ],
    },
  ];

  const kioskUser = await prisma.user.findUnique({
    where: { username: "kiosk-main" },
  });

  for (const supply of defaultSupplies) {
    const { itemTypeSlug, stock, vendors: supplyVendors, ...supplyData } =
      supply;

    const data = {
      ...supplyData,
      siteId,
      // Store the canonical (dash-free) barcode; the app formats it for display.
      barcode: normalizeBarcode(supplyData.barcode),
      itemTypeId: itemTypeBySlug[itemTypeSlug] ?? null,
    };

    // Supply.name is not unique, so guard by name+siteId to stay idempotent
    const existing = await prisma.supply.findFirst({
      where: { name: supply.name, siteId },
    });
    const record = existing
      ? await prisma.supply.update({ where: { id: existing.id }, data })
      : await prisma.supply.create({ data });

    // Stock levels per location (compound unique -> idempotent upsert)
    for (const [locationName, qty] of Object.entries(stock)) {
      const locationId = locationByName[locationName];
      if (!locationId) continue;
      await prisma.stockLevel.upsert({
        where: {
          supplyId_locationId: { supplyId: record.id, locationId },
        },
        update: {
          quantity: qty,
          minimumThreshold: supply.minimumThreshold,
        },
        create: {
          supplyId: record.id,
          locationId,
          quantity: qty,
          minimumThreshold: supply.minimumThreshold,
        },
      });
    }

    // Vendor links (compound unique -> idempotent upsert)
    for (const v of supplyVendors) {
      const vendorId = vendorByName[v.name];
      if (!vendorId) continue;
      await prisma.itemVendor.upsert({
        where: {
          supplyId_vendorId: { supplyId: record.id, vendorId },
        },
        update: {
          vendorSku: v.vendorSku,
          internalSku: supply.internalSku,
          isPreferred: v.isPreferred,
          leadTimeDays: v.leadTimeDays,
          moq: v.moq,
          cost: v.cost,
        },
        create: {
          supplyId: record.id,
          vendorId,
          vendorSku: v.vendorSku,
          internalSku: supply.internalSku,
          isPreferred: v.isPreferred,
          leadTimeDays: v.leadTimeDays,
          moq: v.moq,
          cost: v.cost,
        },
      });
    }

    // Seed one RECEIVE stock movement per supply, only if none exist yet
    // (StockMovement has no natural unique key, so guard by count to stay idempotent)
    const movementCount = await prisma.stockMovement.count({
      where: { supplyId: record.id },
    });
    if (movementCount === 0) {
      // Log the receipt at the supply's primary (first) stock location.
      const [primaryLocationName, primaryQty] = Object.entries(stock)[0] ?? [];
      const primaryLocationId = primaryLocationName
        ? locationByName[primaryLocationName]
        : undefined;
      if (primaryLocationId) {
        await prisma.stockMovement.create({
          data: {
            supplyId: record.id,
            locationId: primaryLocationId,
            quantity: primaryQty ?? supply.quantity,
            type: StockMovementType.RECEIVE,
            userId: kioskUser?.id ?? null,
            notes: "Initial seed stock",
          },
        });
      }
    }
  }

  console.log("✓ Default supplies (with stock, vendors & movements) created");
}

async function createFakeUsers(count: number, siteId: string) {
  const fakeUsers = Array.from({ length: count }, () => ({
    username: faker.internet.username().toLowerCase(),
    email: faker.internet.email().toLowerCase(),
    password: "password123", // We'll hash this
    role: faker.helpers.arrayElement([Role.ADMIN, Role.STAFF]) as typeof Role,
  }));

  // Ensure unique usernames and emails
  const uniqueUsers = fakeUsers.filter(
    (user, index, self) =>
      index === self.findIndex((u) => u.username === user.username) &&
      index === self.findIndex((u) => u.email === user.email)
  );

  for (const user of uniqueUsers) {
    const hashedPassword = await bcrypt.hash(user.password, 10);
    await prisma.user.upsert({
      where: { username: user.username },
      update: {
        email: user.email,
        emailVerified: new Date(),
        siteId,
      },
      create: {
        username: user.username,
        email: user.email,
        emailVerified: new Date(),
        password: hashedPassword,
        role: user.role,
        siteId,
      },
    });
  }

  console.log(`✓ Created ${uniqueUsers.length} fake users`);
}

async function createFakeVendors(count: number, siteId: string) {
  for (let i = 0; i < count; i++) {
    const name = faker.company.name();
    const existing = await prisma.vendor.findFirst({
      where: { name, siteId },
    });
    if (existing) continue;
    await prisma.vendor.create({
      data: {
        siteId,
        name,
        contact: faker.internet.email().toLowerCase(),
        website: faker.internet.url(),
        notes: faker.company.catchPhrase(),
      },
    });
  }
  console.log(`✓ Created up to ${count} fake vendors`);
}

async function createFakeSupplies(count: number, siteId: string) {
  const officeSupplies = [
    "Stapler",
    "Paper Clips",
    "Folders",
    "Notebooks",
    "Markers",
    "Highlighters",
    "Envelopes",
    "Binders",
    "Scissors",
    "Tape",
    "Calculator",
    "Rubber Bands",
    "Index Cards",
    "Labels",
    "Pencils",
  ];

  // Generate supplies ensuring unique names
  const supplies = Array.from({ length: count }, (_, i) => ({
    name:
      i < officeSupplies.length
        ? officeSupplies[i]
        : `${faker.commerce.productAdjective()} ${faker.commerce.product()}`,
    description: faker.commerce.productDescription(),
    quantity: faker.number.int({ min: 0, max: 100 }),
    minimumThreshold: faker.number.int({ min: 5, max: 20 }),
  }));

  // Ensure unique names
  const uniqueSupplies = supplies.filter(
    (supply, index, self) =>
      index === self.findIndex((s) => s.name === supply.name)
  );

  const [itemTypes, locations, vendors, existingSupplies] = await Promise.all([
    prisma.itemType.findMany({ where: { siteId } }),
    prisma.location.findMany({ where: { siteId } }),
    prisma.vendor.findMany({ where: { siteId } }),
    prisma.supply.findMany({
      where: { siteId, barcode: { not: null } },
      select: { barcode: true },
    }),
  ]);

  // Track used barcodes to keep generated ones unique (per-site).
  const usedBarcodes = new Set<string>(
    existingSupplies
      .map((s: { barcode: string | null }) => s.barcode)
      .filter((b: string | null): b is string => Boolean(b))
  );

  for (const supply of uniqueSupplies) {
    const existing = await prisma.supply.findFirst({
      where: { name: supply.name, siteId },
    });
    if (existing) continue;

    const created = await prisma.supply.create({
      data: {
        ...supply,
        siteId,
        barcode: await generateUniqueBarcode(usedBarcodes, siteId),
        itemTypeId: itemTypes.length
          ? faker.helpers.arrayElement(itemTypes).id
          : null,
      },
    });

    // Spread stock across 1-2 random locations
    const chosenLocations = faker.helpers.arrayElements(
      locations,
      Math.min(locations.length, faker.number.int({ min: 1, max: 2 }))
    );
    for (const location of chosenLocations) {
      await prisma.stockLevel.upsert({
        where: {
          supplyId_locationId: {
            supplyId: created.id,
            locationId: location.id,
          },
        },
        update: {},
        create: {
          supplyId: created.id,
          locationId: location.id,
          quantity: faker.number.int({ min: 0, max: supply.quantity }),
          minimumThreshold: supply.minimumThreshold,
        },
      });
    }

    // Link 1-2 random vendors
    const chosenVendors = faker.helpers.arrayElements(
      vendors,
      Math.min(vendors.length, faker.number.int({ min: 1, max: 2 }))
    );
    let preferredAssigned = false;
    for (const vendor of chosenVendors) {
      await prisma.itemVendor.upsert({
        where: {
          supplyId_vendorId: { supplyId: created.id, vendorId: vendor.id },
        },
        update: {},
        create: {
          supplyId: created.id,
          vendorId: vendor.id,
          vendorSku: faker.string.alphanumeric(8).toUpperCase(),
          isPreferred: !preferredAssigned,
          leadTimeDays: faker.number.int({ min: 1, max: 14 }),
          moq: faker.number.int({ min: 1, max: 50 }),
          cost: Number(faker.commerce.price({ min: 0.25, max: 50 })),
        },
      });
      preferredAssigned = true;
    }
  }

  console.log(`✓ Created ${uniqueSupplies.length} fake supplies`);
}

async function createFakeOpenOrders(count: number) {
  const [supplies, users] = await Promise.all([
    prisma.supply.findMany({
      include: {
        itemVendors: { include: { vendor: true } },
        vendorReorders: { select: { id: true } },
      },
    }),
    prisma.user.findMany({ where: { role: { in: [Role.ADMIN, Role.STAFF] } } }),
  ]);

  if (!supplies.length || !users.length) {
    console.log("⚠ No supplies or users found. Skipping open order creation.");
    return;
  }

  const candidates = supplies.filter(
    (s: { vendorReorders: { id: string }[] }) => s.vendorReorders.length === 0
  );
  const pool = candidates.length ? candidates : supplies;
  let created = 0;

  for (let i = 0; i < count && i < pool.length; i++) {
    const supply = pool[i];
    const preferred =
      supply.itemVendors?.find(
        (iv: { isPreferred: boolean }) => iv.isPreferred
      ) ?? supply.itemVendors?.[0];
    const creator = faker.helpers.arrayElement(users);
    const status = faker.helpers.arrayElement([
      VendorReorderStatus.ORDERED,
      VendorReorderStatus.ORDERED,
      VendorReorderStatus.PARTIALLY_RECEIVED,
    ]);
    const quantity = faker.number.int({ min: 2, max: 12 });

    const reorder = await prisma.vendorReorder.create({
      data: {
        supplyId: supply.id,
        vendorId: preferred?.vendorId ?? null,
        quantity,
        externalPoNumber: `PO-FKR-${faker.string.alphanumeric(6).toUpperCase()}`,
        status,
        notes: "Faker demo corporate PO",
        createdById: creator.id,
      },
    });

    if (status === VendorReorderStatus.PARTIALLY_RECEIVED) {
      const location =
        (await prisma.stockLevel.findFirst({
          where: { supplyId: supply.id },
        })) ?? null;
      if (location) {
        const partialQty = Math.max(1, Math.floor(quantity / 2));
        await prisma.stockMovement.create({
          data: {
            supplyId: supply.id,
            locationId: location.locationId,
            quantity: partialQty,
            type: StockMovementType.RECEIVE,
            userId: creator.id,
            notes: "Partial receipt against faker PO",
            vendorReorderId: reorder.id,
          },
        });
      }
    }

    created++;
  }

  console.log(`✓ Created ${created} fake open vendor orders`);
}

async function createAuditLogs(siteId: string) {
  const users = await prisma.user.findMany({ where: { siteId } });
  if (!users.length) return;

  const auditActions = [
    "Logged in",
    "Logged corporate PO",
    "Received inbound stock",
    "Updated inventory",
    "Approved leftover request",
    "Denied leftover request",
    "Modified supply details",
  ];

  // Create audit logs one by one to maintain chronological order
  for (let i = 0; i < 50; i++) {
    await prisma.auditLog.create({
      data: {
        siteId,
        userId: faker.helpers.arrayElement(users).id,
        action: faker.helpers.arrayElement(auditActions),
      },
    });
  }

  console.log("✓ Created audit logs");
}

async function createUsageHistory({
  force = false,
  siteId,
}: { force?: boolean; siteId?: string } = {}) {
  const [supplies, users] = await Promise.all([
    prisma.supply.findMany({
      where: siteId ? { siteId } : undefined,
      include: { stockLevels: { include: { location: true } } },
    }),
    prisma.user.findMany({
      where: siteId ? { siteId } : undefined,
    }),
  ]);

  if (!supplies.length || !users.length) {
    console.log("⚠ No supplies or users found. Skipping usage history.");
    return;
  }

  const consumers = users.filter(
    (u: { username: string }) => u.username !== "kiosk-main"
  );
  const actorPool = consumers.length ? consumers : users;
  const channels = ["kiosk", "manual adjustment", "request fulfillment"];

  let movements = 0;
  let logs = 0;

  for (const supply of supplies) {
    // Per-supply idempotency guard for the default path. The faker path passes
    // `force: true` to always append fresh usage (non-idempotent by design).
    if (!force) {
      const alreadyConsumed = await prisma.stockMovement.count({
        where: { supplyId: supply.id, type: StockMovementType.CONSUME },
      });
      if (alreadyConsumed > 0) continue;
    }

    // Consume from a location that actually has stock (prefer the frontline).
    const stockLevel =
      supply.stockLevels.find(
        (s: { location: { name: string } }) =>
          s.location.name === "Watchpoint Delta"
      ) ?? supply.stockLevels[0];
    if (!stockLevel) continue;

    const events = faker.number.int({ min: 4, max: 8 });
    for (let i = 0; i < events; i++) {
      const quantity = faker.number.int({ min: 1, max: 5 });
      const actor = faker.helpers.arrayElement(actorPool);
      const channel = faker.helpers.arrayElement(channels);
      // Spread events over the past 30 days for realistic time-series data.
      const createdAt = faker.date.recent({ days: 30 });

      await prisma.stockMovement.create({
        data: {
          supplyId: supply.id,
          locationId: stockLevel.locationId,
          quantity,
          type: StockMovementType.CONSUME,
          userId: actor.id,
          notes: `Consumed ${quantity} via ${channel}`,
          createdAt,
        },
      });
      movements++;

      // Paired audit-log entry for each consumption event.
      await prisma.auditLog.create({
        data: {
          siteId: supply.siteId,
          userId: actor.id,
          action: `Consumed ${quantity} × ${supply.name} (${channel})`,
          createdAt,
        },
      });
      logs++;
    }
  }

  console.log(
    `✓ Created usage history: ${movements} consumption events + ${logs} log entries`
  );
}

async function createDefaultNotifications() {
  // Notify the first admin (handler) about low stock.
  const admin = await prisma.user.findFirst({
    where: { role: Role.ADMIN },
    orderBy: { username: "asc" },
  });
  if (!admin) return;

  const supplies = await prisma.supply.findMany({
    include: { stockLevels: true },
  });

  let created = 0;
  for (const supply of supplies) {
    const totalStock = supply.stockLevels.reduce(
      (sum: number, s: { quantity: number }) => sum + s.quantity,
      0
    );
    if (totalStock <= supply.minimumThreshold) {
      // Per-supply idempotency guard.
      const exists = await prisma.notification.count({
        where: {
          type: "LOW_STOCK",
          metadata: { path: ["supplyId"], equals: supply.id },
        },
      });
      if (exists > 0) continue;

      await prisma.notification.create({
        data: {
          userId: admin.id,
          type: "LOW_STOCK",
          title: "Low stock warning",
          message: `${supply.name} is at or below its minimum threshold (${totalStock}/${supply.minimumThreshold}).`,
          metadata: { supplyId: supply.id, totalStock },
        },
      });
      created++;
    }
  }

  console.log(`✓ Created ${created} low-stock notifications`);
}

async function createDefaultOpenOrders() {
  const [users, supplies] = await Promise.all([
    prisma.user.findMany({ select: { id: true, username: true } }),
    prisma.supply.findMany({
      select: {
        id: true,
        name: true,
        itemVendors: {
          select: {
            vendorId: true,
            isPreferred: true,
            vendor: { select: { name: true } },
          },
        },
      },
    }),
  ]);

  const userByName = Object.fromEntries(
    users.map((u: { username: string; id: string }) => [u.username, u.id])
  );
  const supplyByName = Object.fromEntries(
    supplies.map((s: { name: string; id: string }) => [s.name, s])
  );

  const wanted = [
    {
      supply: "Balam Head Unit",
      quantity: 4,
      externalPoNumber: "PO-BLM-1102",
      status: VendorReorderStatus.ORDERED,
      createdBy: "carla",
      notes: "Corporate replenishment",
    },
    {
      supply: "RaD Shotgun",
      quantity: 6,
      externalPoNumber: "PO-RAD-8841",
      status: VendorReorderStatus.PARTIALLY_RECEIVED,
      createdBy: "walter",
      notes: "Partial shipment expected",
      partialReceiveQty: 2,
    },
    {
      supply: "Schneider Booster",
      quantity: 3,
      externalPoNumber: "PO-ARQ-2209",
      status: VendorReorderStatus.ORDERED,
      createdBy: "carla",
      notes: null,
    },
    {
      supply: "Balam Core Unit",
      quantity: 2,
      externalPoNumber: "PO-BLM-1108",
      status: VendorReorderStatus.RECEIVED,
      createdBy: "walter",
      notes: "Fully received seed order",
      fullReceive: true,
    },
  ];

  let created = 0;
  for (const order of wanted) {
    const supply = supplyByName[order.supply];
    const createdById = userByName[order.createdBy];
    if (!supply || !createdById) continue;

    const existing = await prisma.vendorReorder.findFirst({
      where: {
        supplyId: supply.id,
        externalPoNumber: order.externalPoNumber,
      },
    });
    if (existing) continue;

    const preferred =
      supply.itemVendors.find(
        (iv: { isPreferred: boolean }) => iv.isPreferred
      ) ?? supply.itemVendors[0];

    const reorder = await prisma.vendorReorder.create({
      data: {
        supplyId: supply.id,
        vendorId: preferred?.vendorId ?? null,
        quantity: order.quantity,
        externalPoNumber: order.externalPoNumber,
        status: order.status,
        notes: order.notes,
        createdById,
        ...(order.status === VendorReorderStatus.RECEIVED
          ? { receivedAt: new Date() }
          : {}),
      },
    });

    const receiveQty =
      order.partialReceiveQty ??
      (order.fullReceive ? order.quantity : null);

    if (receiveQty) {
      const stockLevel = await prisma.stockLevel.findFirst({
        where: { supplyId: supply.id },
      });
      if (stockLevel) {
        await prisma.stockMovement.create({
          data: {
            supplyId: supply.id,
            locationId: stockLevel.locationId,
            quantity: receiveQty,
            type: StockMovementType.RECEIVE,
            userId: createdById,
            notes: `Seed receipt for ${order.externalPoNumber}`,
            vendorReorderId: reorder.id,
          },
        });
      }
    }

    created++;
  }

  console.log(`✓ Created ${created} default open/closed vendor orders`);
}

async function main() {
  console.log("🌱 Starting seed...");

  await clearDatabase();
  const site = await ensureMainSite();

  if (argv["settings-only"]) {
    await createDefaultSettings(site.id);
  } else {
    // Sane, idempotent defaults (safe to run repeatedly via `npx prisma db seed`)
    await createDefaultUsers(site.id);
    await ensureSuperAdmin();
    await createDefaultSettings(site.id);
    await createDefaultItemTypes(site.id);
    await createDefaultLocations(site.id);
    await createDefaultVendors(site.id);
    await createDefaultSupplies(site.id);
    await createDefaultOpenOrders();
    await createUsageHistory({ siteId: site.id });
    await createDefaultNotifications();

    if (argv["use-faker"]) {
      // Additional randomized demo data (opt-in; non-deterministic)
      await createFakeUsers(argv.count, site.id);
      await createFakeVendors(
        Math.max(3, Math.floor(argv.products / 4)),
        site.id
      );
      await createFakeSupplies(argv.products, site.id);
      await createFakeOpenOrders(argv.orders);
      await createAuditLogs(site.id);
      // Faker path: always append fresh usage history (non-idempotent) so demo
      // runs accumulate richer consumption data, then refresh notifications.
      await createUsageHistory({ force: true, siteId: site.id });
      await createDefaultNotifications();
    }
  }

  console.log("✅ Seed completed");
}

main()
  .catch((e) => {
    console.error("❌ Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
