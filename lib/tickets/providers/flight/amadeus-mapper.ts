import type {
  TicketOffer,
  TicketSearchInput,
} from "../../types";

import type {
  AmadeusFlightOffer,
  AmadeusFlightOffersResponse,
  AmadeusFlightSegment,
} from "./amadeus-client";

function isoDurationToMinutes(
  value: string
) {
  const match =
    value.match(
      /^PT(?:(\d+)H)?(?:(\d+)M)?$/
    );

  if (!match) {
    return 0;
  }

  const hours =
    Number(
      match[1] ?? 0
    );

  const minutes =
    Number(
      match[2] ?? 0
    );

  return (
    hours * 60 +
    minutes
  );
}

function clock(
  value: string
) {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return date
    .toISOString()
    .slice(11, 16);
}

function localDate(
  value: string
) {
  return value.slice(
    0,
    10
  );
}

function totalStops(
  segments:
    AmadeusFlightSegment[]
) {
  if (
    segments.length <= 1
  ) {
    return 0;
  }

  return (
    segments.length - 1
  );
}

function baggageLabel(
  offer: AmadeusFlightOffer
) {
  const detail =
    offer
      .travelerPricings?.[0]
      ?.fareDetailsBySegment?.[0]
      ?.includedCheckedBags;

  if (!detail) {
    return null;
  }

  if (
    typeof detail.quantity ===
    "number"
  ) {
    return (
      `${detail.quantity} parça bagaj`
    );
  }

  if (
    typeof detail.weight ===
    "number"
  ) {
    return (
      `${detail.weight} ${
        detail.weightUnit ??
        "KG"
      } bagaj`
    );
  }

  return null;
}

function cabinLabel(
  offer: AmadeusFlightOffer
) {
  return (
    offer
      .travelerPricings?.[0]
      ?.fareDetailsBySegment?.[0]
      ?.cabin ??
    null
  );
}

export function mapAmadeusFlightOffers(
  response:
    AmadeusFlightOffersResponse,
  search:
    TicketSearchInput
): TicketOffer[] {
  const carriers =
    response.dictionaries
      ?.carriers ?? {};

  return (
    response.data ?? []
  )
    .map(
      (
        offer
      ): TicketOffer | null => {
        const itinerary =
          offer.itineraries?.[0];

        const segments =
          itinerary?.segments ??
          [];

        const first =
          segments[0];

        const last =
          segments[
            segments.length - 1
          ];

        if (
          !first ||
          !last
        ) {
          return null;
        }

        const carrierCode =
          offer
            .validatingAirlineCodes
            ?.[0] ??
          first.carrierCode;

        const stops =
          totalStops(
            segments
          );

        const price =
          Number(
            offer.price
              .grandTotal ??
            offer.price.total
          );

        if (
          !Number.isFinite(
            price
          )
        ) {
          return null;
        }

        const aircraftCode =
          first.aircraft
            ?.code;

        const aircraftName =
          aircraftCode
            ? response
                .dictionaries
                ?.aircraft
                ?.[
                  aircraftCode
                ]
            : undefined;

        return {
          id:
            offer.id,
          providerId:
            "flight_primary",
          providerOfferId:
            offer.id,
          mode:
            "flight",

          carrierName:
            carriers[
              carrierCode
            ] ??
            carrierCode,

          carrierCode,

          origin:
            first.departure
              .iataCode,

          destination:
            last.arrival
              .iataCode,

          departureDate:
            localDate(
              first.departure
                .at
            ),

          departureTime:
            clock(
              first.departure
                .at
            ),

          arrivalTime:
            clock(
              last.arrival.at
            ),

          durationMinutes:
            isoDurationToMinutes(
              itinerary.duration
            ),

          direct:
            stops === 0,

          stops,

          vehicleLabel:
            aircraftName ??
            aircraftCode ??
            "Uçak",

          cabinLabel:
            cabinLabel(
              offer
            ),

          baggageLabel:
            baggageLabel(
              offer
            ),

          seatSelection:
            false,

          refundable:
            false,

          changeable:
            false,

          remainingSeats:
            offer
              .numberOfBookableSeats ??
            null,

          price,

          currency:
            offer.price
              .currency,

          badges: [
            ...(stops === 0
              ? [
                  "Direkt",
                ]
              : []),

            ...(
              offer
                .numberOfBookableSeats &&
              offer
                .numberOfBookableSeats <=
                4
                ? [
                    "Son koltuklar",
                  ]
                : []
            ),
          ],
        };
      }
    )
    .filter(
      (
        offer
      ): offer is TicketOffer =>
        Boolean(offer)
    );
}
