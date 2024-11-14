const { PrismaClient, Role, RequestStatus } = require("@prisma/client");
const { faker } = require("@faker-js/faker");
const bcrypt = require("bcrypt");
const yargs = require("yargs/yargs");
const { hideBin } = require("yargs/helpers");

const prisma = new PrismaClient();

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
    description: "Use faker to generate test data",
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
    await prisma.auditLog.deleteMany();
    await prisma.request.deleteMany();
    await prisma.supply.deleteMany();
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

async function createDefaultSupplies() {
  const defaultSupplies = [
    {
      name: "Printer Paper",
      description: "A4 white printer paper, 500 sheets per ream",
      quantity: 50,
      minimumThreshold: 10,
    },
    {
      name: "Ballpoint Pens",
      description: "Blue ink ballpoint pens",
      quantity: 100,
      minimumThreshold: 20,
    },
    {
      name: "Sticky Notes",
      description: "3x3 inch yellow sticky notes, 100 sheets per pad",
      quantity: 30,
      minimumThreshold: 5,
    },
  ];

  for (const supply of defaultSupplies) {
    await prisma.supply.upsert({
      where: { name: supply.name },
      update: {},
      create: supply,
    });
  }

  console.log("✓ Default supplies created");
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

  for (const supply of uniqueSupplies) {
    await prisma.supply.upsert({
      where: { name: supply.name },
      update: {},
      create: supply,
    });
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

async function main() {
  console.log("🌱 Starting seed...");

  // Create default system settings regardless of flags
  await createDefaultSettings();

  if (!argv["settings-only"]) {
    // Clear database if --clear flag is provided
    await clearDatabase();

    // Create default users
    await createDefaultUsers();

    // Create default supplies
    await createDefaultSupplies();

    if (argv["use-faker"]) {
      // Create additional fake data if --use-faker is true
      await createFakeUsers(argv.count);
      await createFakeSupplies(argv.products);
      await createFakeRequests(argv.requests);
      await createAuditLogs();
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
