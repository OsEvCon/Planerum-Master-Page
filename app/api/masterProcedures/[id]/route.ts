const BACKEND_BASE = process.env.BACKEND_URL ?? "http://localhost:8080";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const url = `${BACKEND_BASE}/api/public/masterProcedures/${id}`;

  try {
    const res = await fetch(url, { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    return Response.json(data, { status: res.status });
  } catch {
    return Response.json(
      { error: "Backend unavailable" },
      { status: 502 }
    );
  }
}
