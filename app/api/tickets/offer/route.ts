import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  findTicketOfferFromProvider,
} from "@/lib/tickets/registry";

import type {
  TicketSearchInput,
} from "@/lib/tickets/types";

export const dynamic =
  "force-dynamic";

type OfferRequest = {
  search: TicketSearchInput;
  providerId: string;
  offerId: string;
};

export async function POST(
  request: NextRequest
) {
  try {
    const body =
      await request.json() as
        OfferRequest;

    const {
      search,
      providerId,
      offerId,
    } = body;

    if (
      !search?.mode ||
      !search.origin ||
      !search.destination ||
      !search.departureDate ||
      !providerId ||
      !offerId
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Provider veya teklif bilgisi eksik.",
        },
        {
          status: 400,
        }
      );
    }

    const offer =
      await findTicketOfferFromProvider(
        search,
        providerId,
        offerId
      );

    if (!offer) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Seçilen sağlayıcıda teklif bulunamadı.",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json({
      ok: true,
      offer,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Teklif alınamadı.",
      },
      {
        status: 500,
      }
    );
  }
}
