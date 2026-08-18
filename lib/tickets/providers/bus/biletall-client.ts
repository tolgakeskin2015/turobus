type BiletallCredentials = {
  serviceUrl: string;
  username: string;
  password: string;
};

export class BiletallConfigurationError
  extends Error {
  constructor(
    message: string
  ) {
    super(message);

    this.name =
      "BiletallConfigurationError";
  }
}

export function getBiletallCredentials():
  BiletallCredentials {
  const serviceUrl =
    process.env.BILETALL_SERVICE_URL;

  const username =
    process.env.BILETALL_USERNAME;

  const password =
    process.env.BILETALL_PASSWORD;

  if (
    !serviceUrl ||
    !username ||
    !password
  ) {
    throw new BiletallConfigurationError(
      "Biletall API bilgileri yapılandırılmadı."
    );
  }

  return {
    serviceUrl,
    username,
    password,
  };
}

export async function biletallSoapRequest(
  soapAction: string,
  body: string
) {
  const {
    serviceUrl,
  } =
    getBiletallCredentials();

  const response =
    await fetch(
      serviceUrl,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "text/xml; charset=utf-8",
          SOAPAction:
            `"${soapAction}"`,
        },
        body,
        cache: "no-store",
      }
    );

  const raw =
    await response.text();

  if (!response.ok) {
    throw new Error(
      `Biletall HTTP ${response.status}: ${raw.slice(
        0,
        400
      )}`
    );
  }

  return raw;
}
