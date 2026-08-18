import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  activeTicketProvider,
} from "@/lib/tickets/provider";

import type {
  TicketSearchInput,
} from "@/lib/tickets/types";

export const dynamic =
  "force-dynamic";

export async function POST(
  request: NextRequest
) {
  try {
    const input =
      await request.json() as
        TicketSearchInput;

    if (
      !input.mode ||
      !input.origin ||
      !input.destination ||
      !input.departureDate
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Eksik bilet arama bilgisi.",
        },
        {
          status: 400,
        }
      );
    }

    const offers =
      await activeTicketProvider.search(
        input
      );

    return NextResponse.json({
      ok: true,
      count:
        offers.length,
      offers,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Bilet araması başarısız.",
      },
      {
        status: 500,
      }
    );
  }
}
