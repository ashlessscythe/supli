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

// Generates a canonical (dash-free) code, e.g. "SUP7K2QXB4M9AZ3".
function generateBarcode() {
  return `SUP${randomBarcodeGroup(4)}${randomBarcodeGroup(4)}${randomBarcodeGroup(4)}`;
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
  const defaultUsers = [
    {
      username: "admin",
      password: "admin123",
      role: Role.ADMIN,
    },
    {
      username: "staff1",
      password: "staff123",
      role: Role.STAFF,
    },
  ];

  for (const user of defaultUsers) {
    const hashedPassword = await bcrypt.hash(user.password, 10);
    await prisma.user.upsert({
      where: { username: user.username },
      update: {},
      create: {
        username: user.username,
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
      slug: "paper",
      name: "Paper Products",
      description: "Printer paper, notebooks, sticky notes and other paper goods",
    },
    {
      slug: "writing",
      name: "Writing Instruments",
      description: "Pens, pencils, markers and highlighters",
    },
    {
      slug: "office",
      name: "General Office",
      description: "Miscellaneous office supplies and accessories",
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
  const locations = [
    {
      name: "Main Office",
      type: "Office",
      description: "Primary office supply cabinet",
    },
    {
      name: "Central Warehouse",
      type: "Warehouse",
      description: "Bulk storage and receiving",
    },
    {
      name: "Storage Room A",
      type: "Storage",
      description: "Overflow storage room on the first floor",
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

  console.log("✓ Default locations created");
}

async function createDefaultVendors() {
  const vendors = [
    {
      name: "Office Depot",
      contact: "orders@officedepot.example.com",
      website: "https://www.officedepot.com",
      notes: "Preferred vendor for general office supplies",
    },
    {
      name: "Staples",
      contact: "support@staples.example.com",
      website: "https://www.staples.com",
      notes: "Fast shipping, good for paper products",
    },
    {
      name: "Uline",
      contact: "sales@uline.example.com",
      website: "https://www.uline.com",
      notes: "Bulk and warehouse supplies",
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

  const defaultSupplies = [
    {
      name: "Printer Paper",
      description: "A4 white printer paper, 500 sheets per ream",
      quantity: 50,
      minimumThreshold: 10,
      barcode: "SUP-PAPR-A4WH-7K21",
      internalSku: "SKU-PAPER-A4",
      itemTypeSlug: "paper",
      // Where the stock physically lives (locationName -> qty)
      stock: { "Main Office": 20, "Central Warehouse": 30 },
      // Vendor links (vendorName -> per-vendor details)
      vendors: [
        {
          name: "Staples",
          vendorSku: "STP-A4-500",
          isPreferred: true,
          leadTimeDays: 3,
          moq: 5,
          cost: 4.99,
        },
        {
          name: "Office Depot",
          vendorSku: "OD-PAPER-A4",
          isPreferred: false,
          leadTimeDays: 5,
          moq: 10,
          cost: 4.49,
        },
      ],
    },
    {
      name: "Ballpoint Pens",
      description: "Blue ink ballpoint pens",
      quantity: 100,
      minimumThreshold: 20,
      barcode: "SUP-PEN5-BLU9-3M8Q",
      internalSku: "SKU-PEN-BLUE",
      itemTypeSlug: "writing",
      stock: { "Main Office": 60, "Storage Room A": 40 },
      vendors: [
        {
          name: "Office Depot",
          vendorSku: "OD-PEN-BLU",
          isPreferred: true,
          leadTimeDays: 2,
          moq: 25,
          cost: 0.35,
        },
      ],
    },
    {
      name: "Sticky Notes",
      description: "3x3 inch yellow sticky notes, 100 sheets per pad",
      quantity: 30,
      minimumThreshold: 5,
      barcode: "SUP-NOT3-3X3Y-Z6R4",
      internalSku: "SKU-NOTE-3X3",
      itemTypeSlug: "office",
      stock: { "Main Office": 30 },
      vendors: [
        {
          name: "Uline",
          vendorSku: "UL-STICKY-3",
          isPreferred: true,
          leadTimeDays: 7,
          moq: 12,
          cost: 1.25,
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
      const mainOfficeId = locationByName["Main Office"];
      if (mainOfficeId) {
        await prisma.stockMovement.create({
          data: {
            supplyId: record.id,
            locationId: mainOfficeId,
            quantity: stock["Main Office"] ?? supply.quantity,
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
    password: "password123", // We'll hash this
    role: faker.helpers.arrayElement([Role.ADMIN, Role.STAFF]) as typeof Role,
  }));

  // Ensure unique usernames
  const uniqueUsers = fakeUsers.filter(
    (user, index, self) =>
      index === self.findIndex((u) => u.username === user.username)
  );

  for (const user of uniqueUsers) {
    const hashedPassword = await bcrypt.hash(user.password, 10);
    await prisma.user.upsert({
      where: { username: user.username },
      update: {},
      create: {
        username: user.username,
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

    // Consume from a location that actually has stock (prefer Main Office).
    const stockLevel =
      supply.stockLevels.find(
        (s: { location: { name: string } }) =>
          s.location.name === "Main Office"
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
  const admin = await prisma.user.findUnique({
    where: { username: "admin" },
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
