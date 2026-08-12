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
    ) === secret
    ||
    request.headers.get(
      "authorization"
    ) ===
      `Bearer ${secret}`
  );
}


async function run(
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
          "Yetkisiz reminder cron isteği.",
      },
      {
        status:
          401,
      }
    );
  }


  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL;


  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;


  if (
    !url ||
    !serviceRoleKey
  ) {

    return NextResponse.json(
      {
        ok:
          false,

        error:
          "Supabase server environment eksik.",
      },
      {
        status:
          500,
      }
    );
  }


  try {

    const admin =
      createClient(
        url,
        serviceRoleKey,
        {
          auth: {
            persistSession:
              false,

            autoRefreshToken:
              false,
          },
        }
      );


    const {
      data,
      error,
    } =
      await admin.rpc(
        "run_package_supplier_reminders",
        {
          p_now:
            new Date()
              .toISOString(),
        }
      );


    if (error) {
      throw error;
    }


    return NextResponse.json({
      ok:
        true,

      result:
        data,

      executedAt:
        new Date()
          .toISOString(),
    });


  } catch (error) {

    return NextResponse.json(
      {
        ok:
          false,

        error:
          error instanceof Error
            ? error.message
            : "Reminder cron hatası.",
      },
      {
        status:
          500,
      }
    );
  }
}


export async function GET(
  request: NextRequest
) {
  return run(
    request
  );
}


export async function POST(
  request: NextRequest
) {
  return run(
    request
  );
}
