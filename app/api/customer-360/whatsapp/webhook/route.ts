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


export async function GET(
  request: NextRequest
) {
  const token =
    process.env
      .WHATSAPP_WEBHOOK_VERIFY_TOKEN;


  if (!token) {
    return new NextResponse(
      "Webhook verify token ayarlı değil.",
      {
        status:
          503,
      }
    );
  }


  const mode =
    request.nextUrl
      .searchParams
      .get(
        "hub.mode"
      );

  const verifyToken =
    request.nextUrl
      .searchParams
      .get(
        "hub.verify_token"
      );

  const challenge =
    request.nextUrl
      .searchParams
      .get(
        "hub.challenge"
      );


  if (
    mode ===
      "subscribe" &&
    verifyToken ===
      token &&
    challenge
  ) {
    return new NextResponse(
      challenge,
      {
        status:
          200,

        headers: {
          "Content-Type":
            "text/plain",
        },
      }
    );
  }


  return new NextResponse(
    "Forbidden",
    {
      status:
        403,
    }
  );
}


export async function POST(
  request: NextRequest
) {
  try {
    const body =
      await request.json();


    const admin =
      serverClient();


    const entries =
      Array.isArray(
        body?.entry
      )
        ? body.entry
        : [];


    let processed =
      0;


    for (
      const entry of
      entries
    ) {
      const changes =
        Array.isArray(
          entry?.changes
        )
          ? entry.changes
          : [];


      for (
        const change of
        changes
      ) {
        const statuses =
          Array.isArray(
            change?.value
              ?.statuses
          )
            ? change.value
                .statuses
            : [];


        for (
          const status of
          statuses
        ) {
          if (
            !status?.id ||
            !status?.status
          ) {
            continue;
          }


          await admin.rpc(
            "update_customer_360_whatsapp_delivery",
            {
              p_provider_message_id:
                String(
                  status.id
                ),

              p_status:
                String(
                  status.status
                ),

              p_payload:
                status,
            }
          );


          processed +=
            1;
        }
      }
    }


    return NextResponse.json({
      ok:
        true,

      processed,
    });

  } catch (
    currentError
  ) {
    return NextResponse.json(
      {
        ok:
          false,

        error:
          currentError instanceof
            Error
            ? currentError.message
            : "Customer 360 WhatsApp webhook hatası.",
      },
      {
        status:
          500,
      }
    );
  }
}
