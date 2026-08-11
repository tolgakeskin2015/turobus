import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getSupabaseAdmin,
} from "@/lib/supabase-admin";

import {
  sendChannelOperation,
} from "@/lib/hotel/channel-manager/provider-adapter";

import {
  sanitizeProviderError,
  validateProviderEndpoint,
} from "@/lib/hotel/channel-manager/providers/runtime/provider-runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_ROLES = new Set([
  "super_admin",
  "company_owner",
  "operation_manager",
]);

const ALLOWED_CHANNELS = new Set([
  "booking",
  "expedia",
  "hotelbeds",
  "airbnb",
  "ets",
  "jolly",
  "tatilliyoruz",
  "website",
  "custom",
]);

function getBearerToken(
  request: NextRequest
): string | null {
  const auth =
    request.headers.get(
      "authorization"
    );

  if (
    !auth ||
    !auth.startsWith("Bearer ")
  ) {
    return null;
  }

  return auth.slice(7).trim() || null;
}

function asRecord(
  value: unknown
): Record<string, unknown> {
  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  ) {
    return value as Record<string, unknown>;
  }

  return {};
}

async function authorizeCompany(
  request: NextRequest,
  companyId: string
) {
  const token =
    getBearerToken(request);

  if (!token) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          ok: false,
          error: "Oturum gerekli.",
        },
        {
          status: 401,
        }
      ),
    };
  }

  const admin =
    getSupabaseAdmin();

  const {
    data: { user },
    error: userError,
  } = await admin.auth.getUser(
    token
  );

  if (
    userError ||
    !user
  ) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          ok: false,
          error:
            "Oturum doğrulanamadı.",
        },
        {
          status: 401,
        }
      ),
    };
  }

  const {
    data: membership,
    error: membershipError,
  } = await admin
    .from("company_members")
    .select("id,role,is_active")
    .eq("user_id", user.id)
    .eq("company_id", companyId)
    .eq("is_active", true)
    .maybeSingle();

  if (membershipError) {
    throw new Error(
      membershipError.message
    );
  }

  if (!membership) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          ok: false,
          error:
            "Firma yetkisi bulunamadı.",
        },
        {
          status: 403,
        }
      ),
    };
  }

  if (
    !ALLOWED_ROLES.has(
      membership.role
    )
  ) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          ok: false,
          error:
            "Bu işlem için yetkiniz yok.",
        },
        {
          status: 403,
        }
      ),
    };
  }

  return {
    ok: true as const,
    admin,
    user,
    membership,
  };
}

export async function GET(
  request: NextRequest
) {
  const companyId =
    request.nextUrl.searchParams.get(
      "companyId"
    ) ?? "";

  if (!companyId) {
    return NextResponse.json(
      {
        ok: false,
        error: "companyId eksik.",
      },
      {
        status: 400,
      }
    );
  }

  const auth =
    await authorizeCompany(
      request,
      companyId
    );

  if (!auth.ok) {
    return auth.response;
  }

  const liveMode =
    process.env.CHANNEL_LIVE_MODE ===
    "true";

  const {
    data: connections,
    error: connectionError,
  } = await auth.admin
    .from("hotel_channel_connections")
    .select(
      "id,status,endpoint_url,credentials,last_success_at,last_error_at,last_error_message"
    )
    .eq(
      "company_id",
      companyId
    );

  if (connectionError) {
    throw new Error(
      connectionError.message
    );
  }

  return NextResponse.json({
    ok: true,

    runtime: {
      liveMode,
      mode:
        liveMode
          ? "live"
          : "simulation",
    },

    connections:
      (connections ?? []).map(
        (item) => {
          const credentials =
            asRecord(
              item.credentials
            );

          return {
            id:
              item.id,

            status:
              item.status,

            endpointConfigured:
              Boolean(
                item.endpoint_url
              ),

            credentialsConfigured:
              Object.keys(
                credentials
              ).length > 0,

            lastSuccessAt:
              item.last_success_at ??
              null,

            lastErrorAt:
              item.last_error_at ??
              null,

            lastErrorMessage:
              item.last_error_message ??
              null,
          };
        }
      ),
  });
}

export async function POST(
  request: NextRequest
) {
  try {
    const body =
      await request.json();

    const companyId =
      String(
        body.companyId ?? ""
      );

    const action =
      String(
        body.action ?? ""
      );

    if (!companyId) {
      return NextResponse.json(
        {
          ok: false,
          error: "companyId eksik.",
        },
        {
          status: 400,
        }
      );
    }

    const auth =
      await authorizeCompany(
        request,
        companyId
      );

    if (!auth.ok) {
      return auth.response;
    }

    const admin = auth.admin;

    if (
      action ===
      "create_connection"
    ) {
      const hotelId =
        String(
          body.hotelId ?? ""
        );

      const channelCode =
        String(
          body.channelCode ?? ""
        )
          .trim()
          .toLowerCase();

      const connectionName =
        String(
          body.connectionName ?? ""
        ).trim();

      const externalHotelId =
        String(
          body.externalHotelId ?? ""
        ).trim() || null;

      const endpointUrl =
        String(
          body.endpointUrl ?? ""
        ).trim() || null;

      if (
        !hotelId ||
        !connectionName ||
        !ALLOWED_CHANNELS.has(
          channelCode
        )
      ) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Bağlantı bilgileri eksik veya geçersiz.",
          },
          {
            status: 400,
          }
        );
      }

      if (endpointUrl) {
        validateProviderEndpoint(
          endpointUrl
        );
      }

      const {
        data: hotel,
        error: hotelError,
      } = await admin
        .from("hotels")
        .select("id")
        .eq("id", hotelId)
        .eq(
          "company_id",
          companyId
        )
        .maybeSingle();

      if (hotelError) {
        throw new Error(
          hotelError.message
        );
      }

      if (!hotel) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Otel bu firmaya ait değil.",
          },
          {
            status: 403,
          }
        );
      }

      const {
        data: connection,
        error,
      } = await admin
        .from(
          "hotel_channel_connections"
        )
        .insert({
          company_id:
            companyId,

          hotel_id:
            hotelId,

          channel_code:
            channelCode,

          connection_name:
            connectionName,

          external_hotel_id:
            externalHotelId,

          endpoint_url:
            endpointUrl,

          status:
            "draft",

          created_by:
            auth.user.id,
        })
        .select("id")
        .single();

      if (error) {
        throw new Error(
          error.message
        );
      }

      return NextResponse.json({
        ok: true,
        connectionId:
          connection.id,
      });
    }

    const connectionId =
      String(
        body.connectionId ?? ""
      );

    if (!connectionId) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "connectionId eksik.",
        },
        {
          status: 400,
        }
      );
    }

    const {
      data: connection,
      error: connectionError,
    } = await admin
      .from(
        "hotel_channel_connections"
      )
      .select(
        "id,company_id,hotel_id,channel_code,status,endpoint_url,external_hotel_id,credentials,settings,last_success_at"
      )
      .eq(
        "company_id",
        companyId
      )
      .eq(
        "id",
        connectionId
      )
      .maybeSingle();

    if (connectionError) {
      throw new Error(
        connectionError.message
      );
    }

    if (!connection) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Kanal bağlantısı bulunamadı.",
        },
        {
          status: 404,
        }
      );
    }

    if (
      action ===
      "activate_connection"
    ) {
      const credentials =
        asRecord(
          connection.credentials
        );

      const settings =
        asRecord(
          connection.settings
        );

      const liveMode =
        process.env.CHANNEL_LIVE_MODE ===
        "true";

      if (
        Object.keys(
          credentials
        ).length === 0
      ) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Bağlantı aktif edilemez: credentials eksik.",
          },
          {
            status: 400,
          }
        );
      }

      if (
        !connection.endpoint_url
      ) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Bağlantı aktif edilemez: provider endpoint eksik.",
          },
          {
            status: 400,
          }
        );
      }

      validateProviderEndpoint(
        connection.endpoint_url
      );

      if (
        liveMode &&
        !connection.last_success_at
      ) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Canlı modda bağlantıyı aktif etmeden önce başarılı bağlantı testi gereklidir.",
          },
          {
            status: 400,
          }
        );
      }

      const {
        error: updateError,
      } = await admin
        .from(
          "hotel_channel_connections"
        )
        .update({
          status:
            "active",

          settings: {
            ...settings,

            activation_checked_at:
              new Date()
                .toISOString(),

            activation_mode:
              liveMode
                ? "live"
                : "simulation",
          },

          updated_at:
            new Date()
              .toISOString(),
        })
        .eq(
          "company_id",
          companyId
        )
        .eq(
          "id",
          connectionId
        );

      if (updateError) {
        throw new Error(
          updateError.message
        );
      }

      return NextResponse.json({
        ok: true,

        activated:
          true,

        mode:
          liveMode
            ? "live"
            : "simulation",
      });
    }

    if (
      action ===
      "save_credentials"
    ) {
      const credentials =
        asRecord(
          body.credentials
        );

      const settings =
        asRecord(
          body.settings
        );

      if (
        Object.keys(
          credentials
        ).length === 0
      ) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Credential bilgisi boş olamaz.",
          },
          {
            status: 400,
          }
        );
      }

      const endpointUrl =
        String(
          body.endpointUrl ??
            connection.endpoint_url ??
            ""
        ).trim() || null;

      if (endpointUrl) {
        validateProviderEndpoint(
          endpointUrl
        );
      }

      const {
        error,
      } = await admin
        .from(
          "hotel_channel_connections"
        )
        .update({
          credentials,

          settings,

          endpoint_url:
            endpointUrl,

          updated_at:
            new Date()
              .toISOString(),
        })
        .eq(
          "company_id",
          companyId
        )
        .eq(
          "id",
          connectionId
        );

      if (error) {
        throw new Error(
          error.message
        );
      }

      return NextResponse.json({
        ok: true,

        credentialsSaved:
          true,
      });
    }

    if (
      action ===
      "test_connection"
    ) {
      const startedAt =
        Date.now();

      const result =
        await sendChannelOperation({
          channelCode:
            connection.channel_code,

          operationType:
            "connection_test",

          endpointUrl:
            connection.endpoint_url,

          payload: {
            requested_at:
              new Date()
                .toISOString(),
          },

          connection: {
            connectionId:
              connection.id,

            companyId:
              connection.company_id,

            hotelId:
              connection.hotel_id,

            endpointUrl:
              connection.endpoint_url,

            externalHotelId:
              connection.external_hotel_id,

            credentials:
              asRecord(
                connection.credentials
              ),

            settings:
              asRecord(
                connection.settings
              ),
          },
        });

      const now =
        new Date()
          .toISOString();

      await admin
        .from(
          "hotel_channel_connections"
        )
        .update(
          result.success
            ? {
                last_sync_at:
                  now,
                last_success_at:
                  now,
                last_error_message:
                  null,
                updated_at:
                  now,
              }
            : {
                last_sync_at:
                  now,
                last_error_at:
                  now,
                last_error_message:
                  "Bağlantı testi başarısız.",
                updated_at:
                  now,
              }
        )
        .eq(
          "company_id",
          companyId
        )
        .eq(
          "id",
          connectionId
        );

      await admin
        .from(
          "hotel_channel_sync_logs"
        )
        .insert({
          company_id:
            companyId,

          hotel_id:
            connection.hotel_id,

          connection_id:
            connection.id,

          queue_id:
            null,

          direction:
            "outbound",

          event_type:
            "connection_test",

          status:
            result.success
              ? "success"
              : "error",

          message:
            result.simulated
              ? "Bağlantı testi simülasyon modunda tamamlandı."
              : result.success
                ? "Canlı OTA bağlantı testi başarılı."
                : "Canlı OTA bağlantı testi başarısız.",

          duration_ms:
            Date.now() -
            startedAt,
        });

      return NextResponse.json({
        ok:
          result.success,

        success:
          result.success,

        simulated:
          result.simulated,

        statusCode:
          result.statusCode ??
          null,

        mode:
          result.simulated
            ? "simulation"
            : "live",
      });
    }

    return NextResponse.json(
      {
        ok: false,
        error:
          "Geçersiz action.",
      },
      {
        status: 400,
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,

        error:
          sanitizeProviderError(
            error
          ) ||
          "Channel connection işlemi başarısız.",
      },
      {
        status: 500,
      }
    );
  }
}
