import type {
  TicketMode,
  TicketSearchInput,
  TicketTripType,
} from "./types";


export function ticketSearchFromParams(
  params: URLSearchParams
): TicketSearchInput {
  const mode =
    (
      params.get("mode") ||
      "bus"
    ) as TicketMode;

  const tripType =
    (
      params.get("tripType") ||
      "one_way"
    ) as TicketTripType;

  return {
    mode,

    tripType,

    origin:
      params.get("origin") ||
      "",

    destination:
      params.get(
        "destination"
      ) ||
      "",

    departureDate:
      params.get("date") ||
      "",

    returnDate:
      params.get(
        "returnDate"
      ) ||
      "",

    adults:
      Math.max(
        1,
        Number(
          params.get(
            "adults"
          ) ||
          params.get(
            "guests"
          ) ||
          1
        )
      ),

    children:
      Math.max(
        0,
        Number(
          params.get(
            "children"
          ) ||
          0
        )
      ),

    infants:
      Math.max(
        0,
        Number(
          params.get(
            "infants"
          ) ||
          0
        )
      ),
  };
}


export function ticketSearchToParams(
  input: TicketSearchInput
) {
  const params =
    new URLSearchParams();

  params.set(
    "mode",
    input.mode
  );

  params.set(
    "tripType",
    input.tripType
  );

  params.set(
    "origin",
    input.origin
  );

  params.set(
    "destination",
    input.destination
  );

  params.set(
    "date",
    input.departureDate
  );

  if (
    input.returnDate
  ) {
    params.set(
      "returnDate",
      input.returnDate
    );
  }

  params.set(
    "adults",
    String(
      input.adults
    )
  );

  params.set(
    "children",
    String(
      input.children
    )
  );

  params.set(
    "infants",
    String(
      input.infants
    )
  );

  return params;
}
