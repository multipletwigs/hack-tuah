import type { NextRequest } from "next/server";

// GET /api/hello
// GET /api/hello?name=zach
export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get("name") ?? "world";
  return Response.json({ message: `hello, ${name}!` });
}
