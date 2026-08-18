export type TicketProviderConfig = {
  enabled: boolean;
  configured: boolean;
};

function envEnabled(
  key: string
) {
  return process.env[key] === "true";
}

export function getBusProviderConfig():
  TicketProviderConfig {
  const enabled =
    envEnabled(
      "TICKET_BUS_PROVIDER_ENABLED"
    );

  const configured =
    Boolean(
      process.env.BILETALL_SERVICE_URL &&
      process.env.BILETALL_USERNAME &&
      process.env.BILETALL_PASSWORD
    );

  return {
    enabled,
    configured,
  };
}

export function getFlightProviderConfig():
  TicketProviderConfig {
  const enabled =
    envEnabled(
      "TICKET_FLIGHT_PROVIDER_ENABLED"
    );

  const configured =
    Boolean(
      process.env.AMADEUS_CLIENT_ID &&
      process.env.AMADEUS_CLIENT_SECRET
    );

  return {
    enabled,
    configured,
  };
}
