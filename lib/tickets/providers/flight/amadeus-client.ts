type AmadeusTokenResponse = {
  access_token: string;
  expires_in: number;
  token_type: string;
};

export type AmadeusFlightSegment = {
  id: string;
  departure: {
    iataCode: string;
    terminal?: string;
    at: string;
  };
  arrival: {
    iataCode: string;
    terminal?: string;
    at: string;
  };
  carrierCode: string;
  number: string;
  aircraft?: {
    code?: string;
  };
  duration?: string;
  numberOfStops?: number;
};

export type AmadeusFlightItinerary = {
  duration: string;
  segments: AmadeusFlightSegment[];
};

export type AmadeusFlightOffer = {
  type: string;
  id: string;
  source?: string;
  instantTicketingRequired?: boolean;
  nonHomogeneous?: boolean;
  oneWay?: boolean;
  lastTicketingDate?: string;
  numberOfBookableSeats?: number;
  itineraries: AmadeusFlightItinerary[];
  price: {
    currency: string;
    total: string;
    base?: string;
    grandTotal?: string;
  };
  validatingAirlineCodes?: string[];
  travelerPricings?: Array<{
    travelerId?: string;
    fareOption?: string;
    travelerType?: string;
    price?: {
      currency?: string;
      total?: string;
      base?: string;
    };
    fareDetailsBySegment?: Array<{
      segmentId?: string;
      cabin?: string;
      class?: string;
      includedCheckedBags?: {
        quantity?: number;
        weight?: number;
        weightUnit?: string;
      };
    }>;
  }>;
};

export type AmadeusFlightOffersResponse = {
  data: AmadeusFlightOffer[];
  dictionaries?: {
    carriers?: Record<string, string>;
    aircraft?: Record<string, string>;
    locations?: Record<
      string,
      {
        cityCode?: string;
        countryCode?: string;
      }
    >;
  };
  meta?: {
    count?: number;
  };
};

const TEST_BASE_URL =
  "https://test.api.amadeus.com";

const PROD_BASE_URL =
  "https://api.amadeus.com";

export class AmadeusConfigurationError
  extends Error {
  constructor(
    message: string
  ) {
    super(message);

    this.name =
      "AmadeusConfigurationError";
  }
}

export function getAmadeusBaseUrl() {
  return (
    process.env.AMADEUS_ENVIRONMENT ===
    "production"
      ? PROD_BASE_URL
      : TEST_BASE_URL
  );
}

export async function getAmadeusAccessToken() {
  const clientId =
    process.env.AMADEUS_CLIENT_ID;

  const clientSecret =
    process.env.AMADEUS_CLIENT_SECRET;

  if (
    !clientId ||
    !clientSecret
  ) {
    throw new AmadeusConfigurationError(
      "Amadeus API bilgileri yapılandırılmadı."
    );
  }

  const body =
    new URLSearchParams({
      grant_type:
        "client_credentials",
      client_id:
        clientId,
      client_secret:
        clientSecret,
    });

  const response =
    await fetch(
      `${getAmadeusBaseUrl()}/v1/security/oauth2/token`,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded",
        },
        body,
        cache: "no-store",
      }
    );

  const payload =
    await response.json() as
      AmadeusTokenResponse & {
        error_description?: string;
      };

  if (!response.ok) {
    throw new Error(
      payload.error_description ??
        `Amadeus token HTTP ${response.status}`
    );
  }

  return payload;
}

type SearchFlightOffersInput = {
  originLocationCode: string;
  destinationLocationCode: string;
  departureDate: string;
  returnDate?: string;
  adults: number;
  children?: number;
  infants?: number;
  currencyCode?: string;
  max?: number;
};

export async function searchAmadeusFlightOffers(
  input: SearchFlightOffersInput
): Promise<AmadeusFlightOffersResponse> {
  const token =
    await getAmadeusAccessToken();

  const params =
    new URLSearchParams({
      originLocationCode:
        input.originLocationCode,
      destinationLocationCode:
        input.destinationLocationCode,
      departureDate:
        input.departureDate,
      adults:
        String(
          Math.max(
            1,
            input.adults
          )
        ),
      max:
        String(
          input.max ?? 40
        ),
    });

  if (input.returnDate) {
    params.set(
      "returnDate",
      input.returnDate
    );
  }

  if (
    input.children &&
    input.children > 0
  ) {
    params.set(
      "children",
      String(
        input.children
      )
    );
  }

  if (
    input.infants &&
    input.infants > 0
  ) {
    params.set(
      "infants",
      String(
        input.infants
      )
    );
  }

  if (input.currencyCode) {
    params.set(
      "currencyCode",
      input.currencyCode
    );
  }

  const response =
    await fetch(
      `${getAmadeusBaseUrl()}/v2/shopping/flight-offers?${params.toString()}`,
      {
        method: "GET",
        headers: {
          Authorization:
            `Bearer ${token.access_token}`,
        },
        cache: "no-store",
      }
    );

  const payload =
    await response.json() as
      AmadeusFlightOffersResponse & {
        errors?: Array<{
          status?: number;
          code?: number;
          title?: string;
          detail?: string;
        }>;
      };

  if (!response.ok) {
    const first =
      payload.errors?.[0];

    throw new Error(
      first?.detail ??
        first?.title ??
        `Amadeus flight search HTTP ${response.status}`
    );
  }

  return payload;
}


export type AmadeusFlightOffersPriceResponse = {
  data: {
    type: string;
    flightOffers:
      AmadeusFlightOffer[];
  };
  dictionaries?: {
    carriers?:
      Record<string, string>;
    aircraft?:
      Record<string, string>;
    locations?: Record<
      string,
      {
        cityCode?: string;
        countryCode?: string;
      }
    >;
  };
};

export async function priceAmadeusFlightOffer(
  offer: AmadeusFlightOffer
): Promise<
  AmadeusFlightOffersPriceResponse
> {
  const token =
    await getAmadeusAccessToken();

  const response =
    await fetch(
      `${getAmadeusBaseUrl()}/v1/shopping/flight-offers/pricing`,
      {
        method:
          "POST",

        headers: {
          Authorization:
            `Bearer ${token.access_token}`,

          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify({
            data: {
              type:
                "flight-offers-pricing",

              flightOffers: [
                offer,
              ],
            },
          }),

        cache:
          "no-store",
      }
    );

  const payload =
    await response.json() as
      AmadeusFlightOffersPriceResponse & {
        errors?: Array<{
          status?: number;
          code?: number;
          title?: string;
          detail?: string;
        }>;
      };

  if (!response.ok) {
    const first =
      payload.errors?.[0];

    throw new Error(
      first?.detail ??
        first?.title ??
        `Amadeus flight price HTTP ${response.status}`
    );
  }

  return payload;
}
