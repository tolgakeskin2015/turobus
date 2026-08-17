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

    const body =
      await request.json();


    const {
      companyId,
      sellerId,
      email,
      fullName,
    } = body;


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
      process.env.NEXT_PUBLIC_SUPABASE_URL;


    const serviceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY;


    if (
      !url ||
      !serviceKey
    ) {

      return NextResponse.json(
        {
          error:
            "SUPABASE_SERVICE_ROLE_KEY tanımlı değil. Partner daveti için server anahtarı gerekli.",
        },
        {
          status: 503,
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
        invited,
      error:
        inviteError,
    } =
      await admin.auth.admin.inviteUserByEmail(
        email,
        {
          data: {
            full_name:
              fullName ||
              null,

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


    const {
      error:
        memberError,
    } =
      await admin
        .from(
          "company_members"
        )
        .insert({
          user_id:
            userId,

          company_id:
            companyId,

          role:
            "sales",

          full_name:
            fullName ||
            null,

          is_active:
            true,
        });


    if (
      memberError
    ) {

      return NextResponse.json(
        {
          error:
            memberError.message,
        },
        {
          status: 400,
        }
      );

    }


    const {
      error:
        sellerUserError,
    } =
      await admin
        .from(
          "activity_os_seller_users"
        )
        .insert({
          company_id:
            companyId,

          seller_id:
            sellerId,

          user_id:
            userId,

          is_active:
            true,
        });


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
