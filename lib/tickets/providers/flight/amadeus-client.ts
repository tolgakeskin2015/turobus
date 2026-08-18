type AmadeusTokenResponse = {
  access_token: string;
  expires_in: number;
  token_type: string;
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
