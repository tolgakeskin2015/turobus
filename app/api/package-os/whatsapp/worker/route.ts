import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  createClient,
} from "@supabase/supabase-js";


export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";


type QueueRow = {
  id: string;

  to_phone: string;

  supplier_name:
    string | null;

  title: string;

  message:
    string | null;

  template_name:
    string | null;

  template_language:
    string | null;
};


function authorized(
  request: NextRequest
) {
  const secret =
    process.env.PACKAGE_OS_CRON_SECRET ||
    process.env.CHANNEL_WORKER_SECRET;

  if (!secret) {
    return false;
  }

  return (
    request.headers.get(
      "x-worker-secret"
    ) === secret ||
    request.headers.get(
      "authorization"
    ) ===
      `Bearer ${secret}`
  );
}


function serverClient() {
  const url =
    process.env
      .NEXT_PUBLIC_SUPABASE_URL;

  const key =
    process.env
      .SUPABASE_SERVICE_ROLE_KEY;

  if (
    !url ||
    !key
  ) {
    throw new Error(
      "Supabase server environment eksik."
    );
  }

  return createClient(
    url,
    key,
    {
      auth: {
        persistSession:
          false,

        autoRefreshToken:
          false,
      },
    }
  );
}


async function processQueue(
  request: NextRequest
) {
  if (
    !authorized(
      request
    )
  ) {
    return NextResponse.json(
      {
        ok:
          false,

        error:
          "Yetkisiz WhatsApp worker isteği.",
      },
      {
        status:
          401,
      }
    );
  }

  const accessToken =
    process.env
      .WHATSAPP_ACCESS_TOKEN;

  const phoneNumberId =
    process.env
      .WHATSAPP_PHONE_NUMBER_ID;

  const graphVersion =
    process.env
      .WHATSAPP_GRAPH_VERSION;

  const templateName =
    process.env
      .WHATSAPP_TEMPLATE_NAME;

  const templateLanguage =
    process.env
      .WHATSAPP_TEMPLATE_LANGUAGE ||
    "tr";

  if (
    !accessToken ||
    !phoneNumberId ||
    !graphVersion ||
    !templateName
  ) {
    return NextResponse.json(
      {
        ok:
          false,

        configured:
          false,

        error:
          "WhatsApp Cloud API ayarları eksik. WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_GRAPH_VERSION ve WHATSAPP_TEMPLATE_NAME tanımlanmalı.",
      },
      {
        status:
          503,
      }
    );
  }

  const admin =
    serverClient();

  const {
    data,
    error,
  } =
    await admin.rpc(
      "claim_package_whatsapp_queue",
      {
        p_limit:
          20,
      }
    );

  if (error) {
    return NextResponse.json(
      {
        ok:
          false,

        error:
          error.message,
      },
      {
        status:
          500,
      }
    );
  }

  const rows =
    (
      data ??
      []
    ) as QueueRow[];

  const results:
    Array<{
      id: string;
      ok: boolean;
      providerMessageId?: string;
      error?: string;
    }> = [];

  for (
    const row of
    rows
  ) {
    try {
      const response =
        await fetch(
          `https://graph.facebook.com/${graphVersion}/${phoneNumberId}/messages`,
          {
            method:
              "POST",

            headers: {
              Authorization:
                `Bearer ${accessToken}`,

              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                messaging_product:
                  "whatsapp",

                recipient_type:
                  "individual",

                to:
                  row.to_phone,

                type:
                  "template",

                template: {
                  name:
                    row.template_name ||
                    templateName,

                  language: {
                    code:
                      row.template_language ||
                      templateLanguage,
                  },

                  components: [
                    {
                      type:
                        "body",

                      parameters: [
                        {
                          type:
                            "text",

                          text:
                            row.supplier_name ||
                            "Tedarikçi",
                        },

                        {
                          type:
                            "text",

                          text:
                            row.title,
                        },

                        {
                          type:
                            "text",

                          text:
                            row.message ||
                            "-",
                        },
                      ],
                    },
                  ],
                },
              }),
          }
        );

      const payload =
        await response.json()
          .catch(
            () => ({})
          ) as {
            messages?:
              Array<{
                id?: string;
              }>;

            error?: {
              message?: string;
              code?: number;
            };
          };

      const providerMessageId =
        payload.messages?.[0]?.id;

      if (
        !response.ok ||
        !providerMessageId
      ) {
        throw new Error(
          payload.error?.message ||
          `WhatsApp HTTP ${response.status}`
        );
      }

      const {
        error:
          sentError,
      } =
        await admin.rpc(
          "mark_package_whatsapp_sent",
          {
            p_id:
              row.id,

            p_provider_message_id:
              providerMessageId,

            p_provider_response:
              payload,
          }
        );

      if (sentError) {
        throw sentError;
      }

      results.push({
        id:
          row.id,

        ok:
          true,

        providerMessageId,
      });

    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "WhatsApp gönderim hatası.";

      await admin.rpc(
        "mark_package_whatsapp_failed",
        {
          p_id:
            row.id,

          p_error:
            message,
        }
      );

      results.push({
        id:
          row.id,

        ok:
          false,

        error:
          message,
      });
    }
  }

  return NextResponse.json({
    ok:
      true,

    configured:
      true,

    claimed:
      rows.length,

    sent:
      results.filter(
        item =>
          item.ok
      ).length,

    failed:
      results.filter(
        item =>
          !item.ok
      ).length,

    results,

    executedAt:
      new Date()
        .toISOString(),
  });
}


export async function GET(
  request: NextRequest
) {
  return processQueue(
    request
  );
}


export async function POST(
  request: NextRequest
) {
  return processQueue(
    request
  );
}
