const {
  PrismaClient,
  Role,
  RequestStatus,
  StockMovementType,
} = require("@prisma/client");
const { faker } = require("@faker-js/faker");
const bcrypt = require("bcrypt");
const nodeCrypto = require("crypto");
const yargs = require("yargs/yargs");
const { hideBin } = require("yargs/helpers");

const prisma = new PrismaClient();

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

// barcode is @unique, so guard against both in-memory and DB collisions.
async function generateUniqueBarcode(used: Set<string>) {
  let code = generateBarcode();
  while (
    used.has(code) ||
    (await prisma.supply.findUnique({ where: { barcode: code } }))
  ) {
    code = generateBarcode();
  }
  used.add(code);
  return code;
}

interface FakeRequest {
  userId: string;
  supplyId: string;
  quantity: number;
  status: typeof RequestStatus;
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
  .option("requests", {
    type: "number",
    description: "Number of requests to create",
    default: 30,
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
    await prisma.supply.deleteMany();
    await prisma.vendor.deleteMany();
    await prisma.location.deleteMany();
    await prisma.itemType.deleteMany();
    await prisma.systemSetting.deleteMany();
    await prisma.user.deleteMany();
    console.log("✓ Database cleared");
  }
}

async function createDefaultUsers() {
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
      },
      create: {
        username: user.username,
        email: user.email,
        emailVerified: new Date(),
        password: hashedPassword,
        role: user.role,
      },
    });
  }

  // Dedicated kiosk system user. Kiosk consumption is attributed to this user
  // for the audit trail. It is not meant to be logged into directly, so it gets
  // a random, unknown password.
  await prisma.user.upsert({
    where: { username: "kiosk" },
    update: {},
    create: {
      username: "kiosk",
      password: await bcrypt.hash(
        nodeCrypto.randomBytes(24).toString("hex"),
        10
      ),
      role: Role.STAFF,
    },
  });

  console.log("✓ Default users created");
}

async function createDefaultSettings() {
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
      key: "KIOSK_PASSWORD_HASH",
      // Default kiosk password: "kiosk1234" (change it in Admin → Settings)
      value: await bcrypt.hash("kiosk1234", 10),
      description: "Password required to access the kiosk terminal",
    },
  ];

  for (const setting of defaultSettings) {
    await prisma.systemSetting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    });
  }

  console.log("✓ Default system settings created");
}

async function createDefaultItemTypes() {
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
      where: { slug: itemType.slug },
      update: {
        name: itemType.name,
        description: itemType.description,
      },
      create: itemType,
    });
  }

  console.log("✓ Default item types created");
}

async function createDefaultLocations() {
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
    // name is @unique, so upsert keeps this idempotent
    await prisma.location.upsert({
      where: { name: location.name },
      update: {
        type: location.type,
        description: location.description,
        isActive: true,
      },
      create: location,
    });
  }

  // Retire the pre-AC default locations (incl. the migration's "Main Office")
  // so only the three mission destinations remain active.
  await prisma.location.updateMany({
    where: {
      name: { in: ["Main Office", "Central Warehouse", "Storage Room A"] },
    },
    data: { isActive: false },
  });

  console.log("✓ Default locations created");
}

async function createDefaultVendors() {
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
    // Vendor.name is not unique in the schema, so guard by name to stay idempotent
    const existing = await prisma.vendor.findFirst({
      where: { name: vendor.name },
    });
    if (existing) {
      await prisma.vendor.update({
        where: { id: existing.id },
        data: vendor,
      });
    } else {
      await prisma.vendor.create({ data: vendor });
    }
  }

  console.log("✓ Default vendors created");
}

async function createDefaultSupplies() {
  const [itemTypes, locations, vendors] = await Promise.all([
    prisma.itemType.findMany(),
    prisma.location.findMany(),
    prisma.vendor.findMany(),
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
    where: { username: "kiosk" },
  });

  for (const supply of defaultSupplies) {
    const { itemTypeSlug, stock, vendors: supplyVendors, ...supplyData } =
      supply;

    const data = {
      ...supplyData,
      // Store the canonical (dash-free) barcode; the app formats it for display.
      barcode: normalizeBarcode(supplyData.barcode),
      itemTypeId: itemTypeBySlug[itemTypeSlug] ?? null,
    };

    // Supply.name is not unique, so guard by name to stay idempotent
    const existing = await prisma.supply.findFirst({
      where: { name: supply.name },
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

async function createFakeUsers(count: number) {
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
      },
      create: {
        username: user.username,
        email: user.email,
        emailVerified: new Date(),
        password: hashedPassword,
        role: user.role,
      },
    });
  }

  console.log(`✓ Created ${uniqueUsers.length} fake users`);
}

async function createFakeVendors(count: number) {
  for (let i = 0; i < count; i++) {
    const name = faker.company.name();
    const existing = await prisma.vendor.findFirst({ where: { name } });
    if (existing) continue;
    await prisma.vendor.create({
      data: {
        name,
        contact: faker.internet.email().toLowerCase(),
        website: faker.internet.url(),
        notes: faker.company.catchPhrase(),
      },
    });
  }
  console.log(`✓ Created up to ${count} fake vendors`);
}

async function createFakeSupplies(count: number) {
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
    prisma.itemType.findMany(),
    prisma.location.findMany(),
    prisma.vendor.findMany(),
    prisma.supply.findMany({
      where: { barcode: { not: null } },
      select: { barcode: true },
    }),
  ]);

  // Track used barcodes to keep generated ones unique (barcode is @unique).
  const usedBarcodes = new Set<string>(
    existingSupplies
      .map((s: { barcode: string | null }) => s.barcode)
      .filter((b: string | null): b is string => Boolean(b))
  );

  for (const supply of uniqueSupplies) {
    const existing = await prisma.supply.findFirst({
      where: { name: supply.name },
    });
    if (existing) continue;

    const created = await prisma.supply.create({
      data: {
        ...supply,
        barcode: await generateUniqueBarcode(usedBarcodes),
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

async function createFakeRequests(count: number) {
  const users = await prisma.user.findMany();
  const supplies = await prisma.supply.findMany();

  if (!users.length || !supplies.length) {
    console.log("⚠ No users or supplies found. Skipping request creation.");
    return;
  }

  // Generate unique request combinations
  const existingRequests: FakeRequest[] = await prisma.request.findMany({
    select: { userId: true, supplyId: true },
  });

  const requests: FakeRequest[] = [];
  let attempts = 0;
  const maxAttempts = count * 2; // Allow some room for retries

  while (requests.length < count && attempts < maxAttempts) {
    const userId = faker.helpers.arrayElement(users).id;
    const supplyId = faker.helpers.arrayElement(supplies).id;

    // Check if this combination already exists
    const exists =
      existingRequests.some(
        (r) => r.userId === userId && r.supplyId === supplyId
      ) || requests.some((r) => r.userId === userId && r.supplyId === supplyId);

    if (!exists) {
      requests.push({
        userId,
        supplyId,
        quantity: faker.number.int({ min: 1, max: 10 }),
        status: faker.helpers.arrayElement([
          RequestStatus.PENDING,
          RequestStatus.APPROVED,
          RequestStatus.DENIED,
        ]) as typeof RequestStatus,
      });
    }

    attempts++;
  }

  // Use transaction to ensure atomicity
  await prisma.$transaction(
    requests.map((request) =>
      prisma.request.create({
        data: request,
      })
    )
  );

  console.log(`✓ Created ${requests.length} fake requests`);
}

async function createAuditLogs() {
  const users = await prisma.user.findMany();
  if (!users.length) return;

  const auditActions = [
    "Logged in",
    "Created supply request",
    "Updated inventory",
    "Approved request",
    "Denied request",
    "Modified supply details",
  ];

  // Create audit logs one by one to maintain chronological order
  for (let i = 0; i < 50; i++) {
    await prisma.auditLog.create({
      data: {
        userId: faker.helpers.arrayElement(users).id,
        action: faker.helpers.arrayElement(auditActions),
      },
    });
  }

  console.log("✓ Created audit logs");
}

async function createUsageHistory({ force = false } = {}) {
  const [supplies, users] = await Promise.all([
    prisma.supply.findMany({
      include: { stockLevels: { include: { location: true } } },
    }),
    prisma.user.findMany(),
  ]);

  if (!supplies.length || !users.length) {
    console.log("⚠ No supplies or users found. Skipping usage history.");
    return;
  }

  const consumers = users.filter(
    (u: { username: string }) => u.username !== "kiosk"
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

async function createDefaultRequests() {
  const [users, supplies] = await Promise.all([
    prisma.user.findMany({ select: { id: true, username: true } }),
    prisma.supply.findMany({ select: { id: true, name: true } }),
  ]);

  const userByName = Object.fromEntries(
    users.map((u: { username: string; id: string }) => [u.username, u.id])
  );
  const supplyByName = Object.fromEntries(
    supplies.map((s: { name: string; id: string }) => [s.name, s.id])
  );

  // Ravens requisitioning parts from the shop, across statuses.
  const wanted = [
    { user: "raven", supply: "RaD Shotgun", quantity: 2, status: RequestStatus.APPROVED },
    { user: "raven", supply: "Coral Laser Blade", quantity: 1, status: RequestStatus.PENDING },
    { user: "raven", supply: "Schneider Booster", quantity: 2, status: RequestStatus.APPROVED },
    { user: "rusty", supply: "Schneider Head Unit", quantity: 1, status: RequestStatus.APPROVED },
    { user: "rusty", supply: "Arquebus Core Unit", quantity: 1, status: RequestStatus.PENDING },
    { user: "rusty", supply: "Schneider Reverse-Joint Legs", quantity: 1, status: RequestStatus.PENDING },
    { user: "iguazu", supply: "RaD Assault Rifle", quantity: 3, status: RequestStatus.DENIED },
    { user: "iguazu", supply: "Balam Head Unit", quantity: 1, status: RequestStatus.PENDING },
  ];

  let created = 0;
  for (const r of wanted) {
    const userId = userByName[r.user];
    const supplyId = supplyByName[r.supply];
    if (!userId || !supplyId) continue;

    // Idempotency guard: one seeded request per user+supply pair.
    const existing = await prisma.request.findFirst({
      where: { userId, supplyId },
    });
    if (existing) continue;

    await prisma.request.create({
      data: { userId, supplyId, quantity: r.quantity, status: r.status },
    });
    created++;
  }

  console.log(`✓ Created ${created} default requests`);
}

async function main() {
  console.log("🌱 Starting seed...");

  // Create default system settings regardless of flags
  await createDefaultSettings();

  if (!argv["settings-only"]) {
    // Clear database if --clear flag is provided
    await clearDatabase();

    // Sane, idempotent defaults (safe to run repeatedly via `npx prisma db seed`)
    await createDefaultUsers();
    await createDefaultItemTypes();
    await createDefaultLocations();
    await createDefaultVendors();
    await createDefaultSupplies();
    await createDefaultRequests();
    await createUsageHistory();
    await createDefaultNotifications();

    if (argv["use-faker"]) {
      // Additional randomized demo data (opt-in; non-deterministic)
      await createFakeUsers(argv.count);
      await createFakeVendors(Math.max(3, Math.floor(argv.products / 4)));
      await createFakeSupplies(argv.products);
      await createFakeRequests(argv.requests);
      await createAuditLogs();
      // Faker path: always append fresh usage history (non-idempotent) so demo
      // runs accumulate richer consumption data, then refresh notifications.
      await createUsageHistory({ force: true });
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
