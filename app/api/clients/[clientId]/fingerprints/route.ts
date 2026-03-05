const BACKEND_BASE = process.env.BACKEND_URL ?? "http://localhost:8080";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params;

  const bodyText = await request.text();

  const url = `${BACKEND_BASE}/api/public/clients/${clientId}/fingerprints`;

  try {
    const res = await fetch(url, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: bodyText || undefined,
    });

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

