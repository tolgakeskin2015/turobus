import type {
  ChannelProviderAdapter,
} from "./types";

import {
  SimulationProvider,
} from "./simulation-provider";

import {
  bookingProvider,
} from "./booking/booking-provider";

import {
  expediaProvider,
} from "./expedia/expedia-provider";

import {
  hotelbedsProvider,
} from "./hotelbeds/hotelbeds-provider";

import {
  airbnbProvider,
} from "./airbnb/airbnb-provider";

function normalizeChannelCode(
  channelCode: string
) {
  return channelCode
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export function getChannelProvider(
  channelCode: string
): ChannelProviderAdapter {
  const normalized =
    normalizeChannelCode(channelCode);

  switch (normalized) {
    case "booking":
    case "bookingcom":
      return bookingProvider;

    case "expedia":
      return expediaProvider;

    case "hotelbeds":
      return hotelbedsProvider;

    case "airbnb":
      return airbnbProvider;

    default:
      return new SimulationProvider(
        normalized || "generic"
      );
  }
}
