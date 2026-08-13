import turkeyLocations from "@/app/data/turkey-locations.json";

export const dynamic = "force-dynamic";

type LocationItem = {
  id: number;
  name: string;
};

type ProvinceItem = {
  id: number;
  name: string;
  districts: LocationItem[];
};

const provinces = turkeyLocations as ProvinceItem[];

export async function GET(request: Request) {
  const url = new URL(request.url);
  const provinceId = url.searchParams.get("provinceId");

  if (!provinceId) {
    return Response.json({
      data: provinces.map((province) => ({
        id: province.id,
        name: province.name,
      })),
    });
  }

  const id = Number(provinceId);

  if (!Number.isInteger(id)) {
    return Response.json(
      { error: "Geçersiz il kimliği." },
      { status: 400 }
    );
  }

  const province = provinces.find(
    (item) => item.id === id
  );

  if (!province) {
    return Response.json(
      { error: "İl bulunamadı." },
      { status: 404 }
    );
  }

  return Response.json({
    data: province.districts,
  });
}
