
export default async (request) => {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  if (!id || !/^\d{3,6}$/.test(id)) {
    return Response.json(
      { error: "Identificador de parada no válido" },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(
      `https://www.tua.es/rest/estimaciones/${id}`,
      {
        headers: {
          "Accept": "application/json",
          "User-Agent": "Mozilla/5.0"
        },
        signal: AbortSignal.timeout(12000)
      }
    );

    const data = await response.text();

    return new Response(data, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("content-type") ||
          "application/json; charset=utf-8",
        "Cache-Control": "no-store"
      }
    });

  } catch (error) {
    return Response.json(
      { error: "No se pudo conectar con TUA" },
      { status: 502 }
    );
  }
};
