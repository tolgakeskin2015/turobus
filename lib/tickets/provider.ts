import type {
  TicketHoldResult,
  TicketOffer,
  TicketSearchInput,
} from "./types";


export interface TicketProviderAdapter {
  id: string;
  name: string;

  search(
    input: TicketSearchInput
  ): Promise<TicketOffer[]>;

  getOffer(
    input: TicketSearchInput,
    offerId: string
  ): Promise<TicketOffer | null>;

  createHold(
    input: TicketSearchInput,
    offer: TicketOffer
  ): Promise<TicketHoldResult>;
}


const minutesToClock = (
  time: string,
  add: number
) => {
  const [hour, minute] =
    time.split(":").map(Number);

  const total =
    hour * 60 +
    minute +
    add;

  const nextHour =
    Math.floor(
      (total % 1440) / 60
    );

  const nextMinute =
    total % 60;

  return `${String(
    nextHour
  ).padStart(2, "0")}:${String(
    nextMinute
  ).padStart(2, "0")}`;
};


function basePrice(
  mode: TicketSearchInput["mode"]
) {
  switch (mode) {
    case "flight":
      return 3490;

    case "ferry":
      return 850;

    case "train":
      return 720;

    default:
      return 950;
  }
}


function carriers(
  mode: TicketSearchInput["mode"]
) {
  switch (mode) {
    case "flight":
      return [
        ["TA", "Anadolu Air"],
        ["SK", "SkyJet"],
        ["NX", "NextFly"],
        ["AV", "Aero Voyage"],
        ["VF", "Voyage Fly"],
        ["TR", "Travel Air"],
      ];

    case "ferry":
      return [
        ["BM", "Blue Marine"],
        ["SF", "Sea Ferry"],
        ["AE", "Aegean Express"],
        ["MS", "Marine Shuttle"],
        ["BW", "Blue Wave"],
        ["FS", "Fast Sea"],
      ];

    case "train":
      return [
        ["RX", "Rail Express"],
        ["HS", "HighSpeed Rail"],
        ["AR", "Anatolia Rail"],
        ["CT", "City Train"],
        ["IR", "InterRail TR"],
        ["TR", "Travel Rail"],
      ];

    default:
      return [
        ["NT", "North Travel"],
        ["VR", "Voyage Road"],
        ["AT", "Anatolia Travel"],
        ["MT", "Metro Travel"],
        ["GT", "Grand Transport"],
        ["RX", "Road Express"],
      ];
  }
}


function vehicle(
  mode: TicketSearchInput["mode"],
  index: number
) {
  if (mode === "flight") {
    return index % 2 === 0
      ? "Airbus A320"
      : "Boeing 737";
  }

  if (mode === "ferry") {
    return index % 2 === 0
      ? "Hızlı Feribot"
      : "Deniz Otobüsü";
  }

  if (mode === "train") {
    return "Yüksek Hızlı Tren";
  }

  return index % 2 === 0
    ? "2+1 Premium Otobüs"
    : "2+2 Comfort Otobüs";
}


function cabin(
  mode: TicketSearchInput["mode"]
) {
  if (mode === "flight") {
    return "Ekonomi";
  }

  if (mode === "train") {
    return "Standart";
  }

  return null;
}


function baggage(
  mode: TicketSearchInput["mode"]
) {
  if (mode === "flight") {
    return "15 kg bagaj + kabin";
  }

  if (mode === "bus") {
    return "Standart bagaj dahil";
  }

  if (mode === "ferry") {
    return "El bagajı dahil";
  }

  return "Standart bagaj";
}


function buildOffers(
  input: TicketSearchInput
): TicketOffer[] {
  const list =
    carriers(input.mode);

  const priceBase =
    basePrice(input.mode);

  const times = [
    "06:30",
    "08:15",
    "10:00",
    "12:40",
    "16:15",
    "21:30",
  ];

  return list.map(
    (
      [code, name],
      index
    ) => {
      const duration =
        input.mode === "flight"
          ? 70 + index * 8
          : input.mode === "ferry"
            ? 95 + index * 10
            : input.mode === "train"
              ? 235 + index * 12
              : 420 + index * 28;

      const direct =
        index !== 4;

      const price =
        priceBase +
        index * (
          input.mode === "flight"
            ? 430
            : 115
        );

      return {
        id:
          `${input.mode}-${index + 1}`,

        providerId:
          "turobus_mock",

        providerOfferId:
          `MOCK-${input.mode.toUpperCase()}-${index + 1}`,

        mode:
          input.mode,

        carrierName:
          name,

        carrierCode:
          code,

        origin:
          input.origin,

        destination:
          input.destination,

        departureDate:
          input.departureDate,

        departureTime:
          times[index],

        arrivalTime:
          minutesToClock(
            times[index],
            duration
          ),

        durationMinutes:
          duration,

        direct,

        stops:
          direct ? 0 : 1,

        vehicleLabel:
          vehicle(
            input.mode,
            index
          ),

        cabinLabel:
          cabin(input.mode),

        baggageLabel:
          baggage(input.mode),

        seatSelection:
          input.mode !==
          "flight" ||
          index % 2 === 0,

        refundable:
          index === 0 ||
          index === 2 ||
          index === 5,

        changeable:
          index !== 3,

        remainingSeats:
          4 + index * 3,

        price,

        currency:
          "TRY",

        badges:
          index === 0
            ? [
                "Önerilen",
                "Esnek",
              ]
            : index === 1
              ? ["En Uygun"]
              : index === 2
                ? ["Hızlı"]
                : [],
      };
    }
  );
}


const mockProvider:
  TicketProviderAdapter = {
    id:
      "turobus_mock",

    name:
      "Turobus Provider Preview",

    async search(input) {
      await new Promise(
        (resolve) =>
          setTimeout(
            resolve,
            250
          )
      );

      return buildOffers(
        input
      );
    },

    async getOffer(
      input,
      offerId
    ) {
      return (
        buildOffers(
          input
        ).find(
          (item) =>
            item.id ===
            offerId
        ) ??
        null
      );
    },

    async createHold(
      _input,
      offer
    ) {
      const expires =
        new Date(
          Date.now() +
          15 * 60 * 1000
        );

      return {
        ok:
          true,

        holdId:
          `HOLD-${Date.now()}`,

        expiresAt:
          expires.toISOString(),

        providerReference:
          `PREVIEW-${offer.carrierCode}-${Date.now()
            .toString()
            .slice(-6)}`,
      };
    },
  };


/*
  GERÇEK SAĞLAYICI GELDİĞİNDE:

  1. Yeni adapter oluştur:
     const realProvider: TicketProviderAdapter = {...}

  2. Aşağıdaki export'u mockProvider yerine
     realProvider yap.

  UI / sonuç ekranı / yolcu ekranı / rezervasyon ekranı
  yeniden yazılmaz.
*/

export const activeTicketProvider =
  mockProvider;
