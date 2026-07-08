import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcrypt";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const { username, password } = schema.parse(json);
    const user = await prisma.user.findUnique({
      where: { username },
      select: { role: true, password: true },
    });

    if (!user) {
      return NextResponse.json({ status: "unknown" });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return NextResponse.json({ status: "unknown" });
    }

    if (user.role === Role.PENDING) {
      return NextResponse.json({ status: "pending" });
    }

    return NextResponse.json({ status: "unknown" });
  } catch {
    return NextResponse.json({ status: "unknown" });
  }
}
