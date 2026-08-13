export const dynamic =
  "force-dynamic";

type RawLocation = {
  id?: unknown;
  name?: unknown;
};

type LocationItem = {
  id: number;
  name: string;
};

function normalizeLocations(
  input: unknown
): LocationItem[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((raw: unknown) => {
      const item =
        raw as RawLocation;

      return {
        id: Number(item.id),
        name: String(
          item.name ?? ""
        ).trim(),
      };
    })
    .filter(
      (item: LocationItem) =>
        Number.isFinite(
          item.id
        ) &&
        item.name.length > 0
    );
}

export async function GET(
  request: Request
) {
  try {
    const url =
      new URL(request.url);

    const provinceId =
      url.searchParams.get(
        "provinceId"
      );

    let targetUrl: string;

    if (provinceId) {
      if (
        !/^\d+$/.test(
          provinceId
        )
      ) {
        return Response.json(
          {
            error:
              "Geçersiz il kimliği.",
          },
          {
            status: 400,
          }
        );
      }

      targetUrl =
        `https://api.turkiyeapi.dev/v2/provinces/${provinceId}/districts?fields=id,name&limit=1000&sort=name`;
    } else {
      targetUrl =
        "https://api.turkiyeapi.dev/v2/provinces?fields=id,name&limit=100&sort=name";
    }

    const response =
      await fetch(
        targetUrl,
        {
          cache:
            "no-store",
          headers: {
            Accept:
              "application/json",
          },
        }
      );

    if (!response.ok) {
      return Response.json(
        {
          error:
            "Türkiye lokasyon servisine ulaşılamadı.",
        },
        {
          status: 502,
        }
      );
    }

    const payload:
      unknown =
      await response.json();

    const data =
      normalizeLocations(
        (
          payload as {
            data?: unknown;
          }
        )?.data
      );

    return Response.json({
      data,
    });
  } catch (error) {
    console.error(
      "Turkey location API error:",
      error
    );

    return Response.json(
      {
        error:
          "Lokasyon bilgileri yüklenemedi.",
      },
      {
        status: 500,
      }
    );
  }
}
