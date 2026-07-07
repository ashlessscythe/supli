import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requestService } from "@/server/services/request.service";
import { requestSchema } from "@/lib/validation/request";
import { RequestStatus } from "@prisma/client";
import { z } from "zod";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") as RequestStatus | null;
  const userId = searchParams.get("userId");

  const result = await requestService.list(session.user.id, session.user.role);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  let requests = result.data;
  if (status) {
    requests = requests.filter((r) => r.status === status);
  }
  if (userId && session.user.role === "ADMIN") {
    requests = requests.filter((r) => r.userId === userId);
  }

  return NextResponse.json(requests);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const json = await request.json();
    const data = requestSchema.parse(json);
    const result = await requestService.create(session.user.id, data);
    if (!result.success) {
      const status = result.error === "Supply not found" ? 404 : 400;
      return NextResponse.json({ error: result.error }, { status });
    }
    return NextResponse.json(result.data, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, status } = await request.json();
  if (!id || !status) {
    return NextResponse.json({ error: "Invalid request data" }, { status: 400 });
  }

  const result = await requestService.updateStatus(
    session.user.id,
    id,
    status as RequestStatus
  );

  if (!result.success) {
    const code = result.error === "Request not found" ? 404 : 400;
    return NextResponse.json({ error: result.error }, { status: code });
  }
  return NextResponse.json(result.data);
}
