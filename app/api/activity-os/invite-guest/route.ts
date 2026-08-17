import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  createClient,
} from "@supabase/supabase-js";


export async function POST(
  request:
    NextRequest
) {

  try {

    const {
      bookingId,
    } =
      await request.json();


    if (!bookingId) {
      return NextResponse.json(
        {
          error:
            "Rezervasyon seçilmedi.",
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


    const token =
      request.headers
        .get(
          "authorization"
        )
        ?.replace(
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
            persistSession:
              false,
            autoRefreshToken:
              false,
          },
        }
      );


    const {
      data:
        authUser,
      error:
        authError,
    } =
      await admin.auth.getUser(
        token
      );


    if (
      authError ||
      !authUser.user
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
        booking,
      error:
        bookingError,
    } =
      await admin
        .from(
          "activity_os_bookings"
        )
        .select(
          "id,company_id,customer_name,customer_email"
        )
        .eq(
          "id",
          bookingId
        )
        .maybeSingle();


    if (
      bookingError ||
      !booking
    ) {
      return NextResponse.json(
        {
          error:
            "Rezervasyon bulunamadı.",
        },
        {
          status: 404,
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
          booking.company_id
        )
        .eq(
          "user_id",
          authUser.user.id
        )
        .eq(
          "is_active",
          true
        )
        .maybeSingle();


    if (!membership) {
      return NextResponse.json(
        {
          error:
            "Bu rezervasyon için yetkiniz bulunmuyor.",
        },
        {
          status: 403,
        }
      );
    }


    if (
      !booking.customer_email
    ) {
      return NextResponse.json(
        {
          error:
            "Misafir e-posta adresi bulunmuyor.",
        },
        {
          status: 400,
        }
      );
    }


    let guestUserId:
      string | null =
        null;


    const {
      data:
        inviteData,
      error:
        inviteError,
    } =
      await admin.auth.admin
        .inviteUserByEmail(
          booking.customer_email,
          {
            redirectTo:
              `${request.nextUrl.origin}/aktivite-hesabim`,

            data: {
              full_name:
                booking.customer_name,

              portal_type:
                "activity_guest",
            },
          }
        );


    if (
      !inviteError &&
      inviteData.user
    ) {
      guestUserId =
        inviteData.user.id;
    }


    if (
      !guestUserId
    ) {

      let page =
        1;

      while (
        page <= 10 &&
        !guestUserId
      ) {

        const {
          data:
            usersPage,
          error:
            usersError,
        } =
          await admin.auth.admin
            .listUsers({
              page,
              perPage:
                100,
            });


        if (
          usersError
        ) {
          break;
        }


        const existing =
          usersPage.users.find(
            (
              user
            ) =>
              user.email
                ?.toLocaleLowerCase() ===
              booking.customer_email
                .toLocaleLowerCase()
          );


        if (
          existing
        ) {
          guestUserId =
            existing.id;
          break;
        }


        if (
          usersPage.users.length <
          100
        ) {
          break;
        }


        page += 1;

      }

    }


    if (
      !guestUserId
    ) {
      return NextResponse.json(
        {
          error:
            inviteError?.message ||
            "Misafir hesabı oluşturulamadı.",
        },
        {
          status: 400,
        }
      );
    }


    const {
      error:
        linkError,
    } =
      await admin
        .from(
          "activity_os_guest_users"
        )
        .upsert(
          {
            company_id:
              booking.company_id,

            booking_id:
              booking.id,

            user_id:
              guestUserId,
          },
          {
            onConflict:
              "booking_id,user_id",
          }
        );


    if (
      linkError
    ) {
      return NextResponse.json(
        {
          error:
            linkError.message,
        },
        {
          status: 400,
        }
      );
    }


    return NextResponse.json({
      ok: true,
      userId:
        guestUserId,
    });

  } catch (
    error
  ) {

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Misafir daveti oluşturulamadı.",
      },
      {
        status: 500,
      }
    );

  }

}
