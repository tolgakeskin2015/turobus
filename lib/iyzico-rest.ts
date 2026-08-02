import crypto from "node:crypto";

type IyzicoRequestOptions = {
  path: string;
  body: Record<string, unknown>;
};

export async function iyzicoPost<T>({
  path,
  body,
}: IyzicoRequestOptions): Promise<T> {
  const apiKey = process.env.IYZICO_API_KEY;
  const secretKey = process.env.IYZICO_SECRET_KEY;
  const baseUrl =
    process.env.IYZICO_BASE_URL ||
    "https://sandbox-api.iyzipay.com";

  if (!apiKey) {
    throw new Error("IYZICO_API_KEY tanımlı değil.");
  }

  if (!secretKey) {
    throw new Error("IYZICO_SECRET_KEY tanımlı değil.");
  }

  const randomKey =
    Date.now().toString() +
    crypto.randomBytes(8).toString("hex");

  const requestBody = JSON.stringify(body);

  const signature = crypto
    .createHmac("sha256", secretKey)
    .update(randomKey + path + requestBody)
    .digest("hex");

  const authorizationPayload =
    `apiKey:${apiKey}` +
    `&randomKey:${randomKey}` +
    `&signature:${signature}`;

  const authorization =
    "IYZWSv2 " +
    Buffer.from(authorizationPayload).toString("base64");

  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      Authorization: authorization,
      "Content-Type": "application/json",
      "x-iyzi-rnd": randomKey,
    },
    body: requestBody,
    cache: "no-store",
  });

  const responseText = await response.text();

  let result: T;

  try {
    result = JSON.parse(responseText) as T;
  } catch {
    throw new Error(
      `iyzico geçersiz yanıt verdi (${response.status}): ` +
        responseText.slice(0, 250)
    );
  }

  if (!response.ok) {
    const errorResult = result as {
      errorMessage?: string;
      errorCode?: string;
    };

    throw new Error(
      errorResult.errorMessage ||
        `iyzico HTTP hatası: ${response.status}`
    );
  }

  return result;
}
