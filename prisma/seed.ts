import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  // Create admin user
  const hashedPassword = await bcrypt.hash("admin123", 10);
  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      password: hashedPassword,
      role: "ADMIN",
    },
  });

  // Create sample supplies
  const supplies = [
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
    {
      name: "Paper Clips",
      description: "Small silver paper clips, 100 per box",
      quantity: 15,
      minimumThreshold: 5,
    },
    {
      name: "Staplers",
      description: "Standard desktop staplers",
      quantity: 8,
      minimumThreshold: 3,
    },
  ];

  for (const supply of supplies) {
    await prisma.supply.upsert({
      where: { name: supply.name },
      update: {},
      create: supply,
    });
  }

  console.log("Seed data created successfully");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
