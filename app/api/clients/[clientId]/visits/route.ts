const BACKEND_BASE = process.env.BACKEND_URL ?? "http://localhost:8080";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params;
  const { searchParams } = new URL(request.url);
  const masterId = searchParams.get("masterId");
  const fingerprint = searchParams.get("fingerprint");
  if (!masterId || !fingerprint) {
    return Response.json(
      { error: "masterId and fingerprint required" },
      { status: 400 }
    );
  }
  const url = `${BACKEND_BASE}/api/public/clients/${clientId}/visits?masterId=${encodeURIComponent(masterId)}&fingerprint=${encodeURIComponent(fingerprint)}`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    const text = await res.text();
    const contentType = res.headers.get("content-type") ?? "application/json";
    return new Response(text, {
      status: res.status,
      headers: { "Content-Type": contentType },
    });
  } catch {
    return Response.json(
      { error: "Backend unavailable" },
      { status: 502 }
    );
  }
}
