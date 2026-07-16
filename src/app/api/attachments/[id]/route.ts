import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { fileService } from "@/server/services/file.service";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await fileService.getById(params.id);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  const { data, filename, mimeType } = result.data;
  if (!data) {
    return NextResponse.json(
      { error: "Attachment has no stored content" },
      { status: 404 }
    );
  }
  const bytes = Uint8Array.from(data);

  return new NextResponse(bytes, {
    status: 200,
    headers: {
      "Content-Type": mimeType,
      "Content-Length": String(bytes.byteLength),
      "Content-Disposition": `inline; filename="${filename.replace(/"/g, "")}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
