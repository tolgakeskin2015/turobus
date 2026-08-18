import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  createTicketHold,
} from "@/lib/tickets/registry";

import type {
  TicketOffer,
  TicketSearchInput,
} from "@/lib/tickets/types";

export const dynamic =
  "force-dynamic";

type HoldRequest = {
  search: TicketSearchInput;
  offer: TicketOffer;
};

export async function POST(
  request: NextRequest
) {
  try {
    const body =
      await request.json() as
        HoldRequest;

    const {
      search,
      offer,
    } = body;

    if (
      !search?.mode ||
      !offer?.id ||
      !offer.providerId
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Hold için provider bilgisi eksik.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      offer.mode !== search.mode
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Teklif türü ile arama türü uyuşmuyor.",
        },
        {
          status: 400,
        }
      );
    }

    const hold =
      await createTicketHold(
        search,
        offer
      );

    return NextResponse.json({
      ok: true,
      hold,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Bilet hold işlemi başarısız.",
      },
      {
        status: 500,
      }
    );
  }
}
