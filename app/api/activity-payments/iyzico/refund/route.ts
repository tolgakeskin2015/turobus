import {
  NextResponse,
} from "next/server";

import {
  iyzicoPost,
} from "@/lib/iyzico-rest";

import {
  getSupabaseAdmin,
} from "@/lib/supabase-admin";


export const runtime =
  "nodejs";


type Body = {
  paymentId?: string;
  amount?: number;
  reason?: string;
};


type RefundResponse = {
  status?: "success" | "failure";

  errorCode?: string;
  errorMessage?: string;

  conversationId?: string;

  paymentId?: string;

  paymentTransactionId?: string;

  price?: number;

  currency?: string;

  hostReference?: string;
};


export async function POST(
  request: Request
) {

  try {

    const admin =
      getSupabaseAdmin();


    const authHeader =
      request.headers.get(
        "authorization"
      );


    const accessToken =
      authHeader?.replace(
        /^Bearer\s+/i,
        ""
      );


    if (
      !accessToken
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
        userData,
      error:
        userError,
    } =
      await admin.auth.getUser(
        accessToken
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


    const body =
      (
        await request.json()
      ) as Body;


    if (
      !body.paymentId ||
      !body.amount ||
      body.amount <= 0
    ) {

      return NextResponse.json(
        {
          error:
            "Ödeme ve iade tutarı zorunludur.",
        },
        {
          status: 400,
        }
      );

    }


    const {
      data:
        payment,
      error:
        paymentError,
    } =
      await admin
        .from(
          "activity_os_payments"
        )
        .select(
          "id,company_id,booking_id,amount,currency,provider,status,provider_payment_id,provider_transaction_id"
        )
        .eq(
          "id",
          body.paymentId
        )
        .maybeSingle();


    if (
      paymentError
    ) {
      throw paymentError;
    }


    if (
      !payment
    ) {

      return NextResponse.json(
        {
          error:
            "Ödeme bulunamadı.",
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
          payment.company_id
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
        "accounting",
      ].includes(
        membership.role
      )
    ) {

      return NextResponse.json(
        {
          error:
            "İade için finans yetkisi gerekli.",
        },
        {
          status: 403,
        }
      );

    }


    if (
      payment.provider !==
        "iyzico" ||
      payment.status !==
        "paid" ||
      !payment.provider_transaction_id
    ) {

      return NextResponse.json(
        {
          error:
            "Bu ödeme online iade için uygun değil.",
        },
        {
          status: 409,
        }
      );

    }


    const {
      data:
        previousRefunds,
      error:
        previousError,
    } =
      await admin
        .from(
          "activity_os_refunds"
        )
        .select(
          "amount"
        )
        .eq(
          "payment_id",
          payment.id
        )
        .eq(
          "status",
          "paid"
        );


    if (
      previousError
    ) {
      throw previousError;
    }


    const refunded =
      (
        previousRefunds ??
        []
      ).reduce(
        (
          total,
          item
        ) =>
          total +
          Number(
            item.amount
          ),
        0
      );


    const remainingRefundable =
      Math.max(
        Number(
          payment.amount
        ) -
        refunded,
        0
      );


    if (
      Number(
        body.amount
      ) >
      remainingRefundable
      + 0.01
    ) {

      return NextResponse.json(
        {
          error:
            `Maksimum iade edilebilir tutar ${remainingRefundable.toFixed(
              2
            )} TL.`,
        },
        {
          status: 409,
        }
      );

    }


    const {
      data:
        refund,
      error:
        refundInsertError,
    } =
      await admin
        .from(
          "activity_os_refunds"
        )
        .insert({
          company_id:
            payment.company_id,

          booking_id:
            payment.booking_id,

          payment_id:
            payment.id,

          amount:
            body.amount,

          currency:
            payment.currency,

          provider:
            "iyzico",

          status:
            "processing",

          reason:
            body.reason ||
            null,

          requested_by:
            userData.user.id,
        })
        .select(
          "id"
        )
        .single();


    if (
      refundInsertError
    ) {
      throw refundInsertError;
    }


    const conversationId =
      crypto.randomUUID();


    const result =
      await iyzicoPost<RefundResponse>({
        path:
          "/payment/refund",

        body: {
          locale:
            "tr",

          conversationId,

          paymentTransactionId:
            payment.provider_transaction_id,

          price:
            Number(
              body.amount
            ).toFixed(
              2
            ),

          currency:
            payment.currency,

          ip:
            request.headers
              .get(
                "x-forwarded-for"
              )
              ?.split(
                ","
              )[0]
              ?.trim() ||
            "127.0.0.1",
        },
      });


    if (
      result.status !==
      "success"
    ) {

      await admin
        .from(
          "activity_os_refunds"
        )
        .update({
          status:
            "failed",

          metadata: {
            error_code:
              result.errorCode,

            error_message:
              result.errorMessage,
          },

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          refund.id
        );


      return NextResponse.json(
        {
          error:
            result.errorMessage ||
            "İade işlemi başarısız.",
        },
        {
          status: 502,
        }
      );

    }


    const {
      error:
        applyError,
    } =
      await admin.rpc(
        "activity_os_apply_provider_refund",
        {
          p_refund_id:
            refund.id,

          p_provider_reference:
            result.hostReference ||
            result.paymentTransactionId ||
            conversationId,

          p_metadata: {
            conversation_id:
              conversationId,

            provider_payment_id:
              result.paymentId,

            payment_transaction_id:
              result.paymentTransactionId,

            returned_price:
              result.price,

            currency:
              result.currency,
          },
        }
      );


    if (
      applyError
    ) {
      throw applyError;
    }


    return NextResponse.json({
      success:
        true,

      refundId:
        refund.id,
    });

  } catch (
    error
  ) {

    console.error(
      "Activity iyzico refund:",
      error
    );


    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "İade gerçekleştirilemedi.",
      },
      {
        status: 500,
      }
    );

  }

}
