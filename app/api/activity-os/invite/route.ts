import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  createClient,
} from "@supabase/supabase-js";


export async function POST(
  request: NextRequest
) {
  try {
    const {
      companyId,
      sellerId,
      email,
      fullName,
    } =
      await request.json();


    if (
      !companyId ||
      !sellerId ||
      !email
    ) {
      return NextResponse.json(
        {
          error:
            "Eksik davet bilgisi.",
        },
        {
          status: 400,
        }
      );
    }


    const url =
      process.env
        .NEXT_PUBLIC_SUPABASE_URL;

    const serviceKey =
      process.env
        .SUPABASE_SERVICE_ROLE_KEY;


    if (
      !url ||
      !serviceKey
    ) {
      return NextResponse.json(
        {
          error:
            "SUPABASE_SERVICE_ROLE_KEY tanımlı değil.",
        },
        {
          status: 503,
        }
      );
    }


    const authHeader =
      request.headers.get(
        "authorization"
      );

    const token =
      authHeader?.replace(
        /^Bearer\s+/i,
        ""
      );


    if (!token) {
      return NextResponse.json(
        {
          error:
            "Oturum doğrulanamadı.",
        },
        {
          status: 401,
        }
      );
    }


    const admin =
      createClient(
        url,
        serviceKey,
        {
          auth: {
            autoRefreshToken:
              false,
            persistSession:
              false,
          },
        }
      );


    const {
      data:
        userData,
      error:
        userError,
    } =
      await admin.auth.getUser(
        token
      );


    if (
      userError ||
      !userData.user
    ) {
      return NextResponse.json(
        {
          error:
            "Oturum doğrulanamadı.",
        },
        {
          status: 401,
        }
      );
    }


    const {
      data:
        membership,
    } =
      await admin
        .from(
          "company_members"
        )
        .select(
          "id,role,is_active"
        )
        .eq(
          "company_id",
          companyId
        )
        .eq(
          "user_id",
          userData.user.id
        )
        .eq(
          "is_active",
          true
        )
        .maybeSingle();


    if (
      !membership ||
      ![
        "super_admin",
        "company_owner",
        "operation_manager",
      ].includes(
        membership.role
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Bu işlem için yönetici yetkisi gerekli.",
        },
        {
          status: 403,
        }
      );
    }


    const {
      data:
        seller,
      error:
        sellerError,
    } =
      await admin
        .from(
          "activity_os_sellers"
        )
        .select(
          "id,company_id,name,is_active"
        )
        .eq(
          "id",
          sellerId
        )
        .eq(
          "company_id",
          companyId
        )
        .eq(
          "is_active",
          true
        )
        .maybeSingle();


    if (
      sellerError ||
      !seller
    ) {
      return NextResponse.json(
        {
          error:
            "Satışçı / partner bulunamadı.",
        },
        {
          status: 404,
        }
      );
    }


    const origin =
      request.nextUrl.origin;


    const {
      data:
        invited,
      error:
        inviteError,
    } =
      await admin.auth.admin
        .inviteUserByEmail(
          email,
          {
            redirectTo:
              `${origin}/activity-satici`,

            data: {
              full_name:
                fullName ||
                null,

              portal_type:
                "activity_seller",

              turobus_company_id:
                companyId,

              activity_seller_id:
                sellerId,
            },
          }
        );


    if (
      inviteError ||
      !invited.user
    ) {
      return NextResponse.json(
        {
          error:
            inviteError?.message ||
            "Kullanıcı davet edilemedi.",
        },
        {
          status: 400,
        }
      );
    }


    const userId =
      invited.user.id;


    /*
      IMPORTANT:
      External seller is deliberately NOT inserted into company_members.

      Therefore:
      - no internal dashboard membership
      - no company finance access
      - no other company bookings
      - no cost/profit access
    */


    const {
      error:
        sellerUserError,
    } =
      await admin
        .from(
          "activity_os_seller_users"
        )
        .upsert(
          {
            company_id:
              companyId,

            seller_id:
              sellerId,

            user_id:
              userId,

            is_active:
              true,
          },
          {
            onConflict:
              "company_id,seller_id,user_id",
          }
        );


    if (
      sellerUserError
    ) {
      return NextResponse.json(
        {
          error:
            sellerUserError.message,
        },
        {
          status: 400,
        }
      );
    }


    return NextResponse.json({
      ok: true,
      userId,
      portal:
        "/activity-satici",
    });

  } catch (
    error
  ) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Partner daveti oluşturulamadı.",
      },
      {
        status: 500,
      }
    );
  }
}
