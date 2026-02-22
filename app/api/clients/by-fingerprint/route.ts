const BACKEND_BASE = process.env.BACKEND_URL ?? "http://localhost:8080";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fingerprint = searchParams.get("fingerprint");
  const masterId = searchParams.get("masterId");
  if (!fingerprint || !masterId) {
    return Response.json(
      { error: "fingerprint and masterId required" },
      { status: 400 }
    );
  }
  const url = `${BACKEND_BASE}/api/public/clients/by-fingerprint?fingerprint=${encodeURIComponent(fingerprint)}&masterId=${encodeURIComponent(masterId)}`;
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
