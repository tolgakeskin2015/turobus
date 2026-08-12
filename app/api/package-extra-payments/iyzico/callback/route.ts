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


type IyzicoRetrieveResponse = {

  status?:
    | "success"
    | "failure";

  errorCode?: string;

  errorMessage?: string;

  conversationId?: string;

  token?: string;

  paymentStatus?:
    | "SUCCESS"
    | "FAILURE";

  paymentId?: string;

  fraudStatus?: number;

  price?: number;

  paidPrice?: number;

  currency?: string;

  basketId?: string;
};


async function getToken(
  request: Request
) {
  const contentType =
    request.headers.get(
      "content-type"
    ) || "";


  if (
    contentType.includes(
      "application/x-www-form-urlencoded"
    ) ||
    contentType.includes(
      "multipart/form-data"
    )
  ) {

    const data =
      await request.formData();


    return String(
      data.get(
        "token"
      ) || ""
    );
  }


  try {

    const body =
      await request.json() as {
        token?: string;
      };


    return body.token ||
      "";

  } catch {

    return "";
  }
}


function returnUrl(
  request: Request,
  bookingToken: string,
  orderToken: string,
  result:
    | "success"
    | "failed",
  message?: string
) {

  const baseUrl =
    (
      process.env
        .NEXT_PUBLIC_SITE_URL ||
      new URL(
        request.url
      ).origin
    ).replace(
      /\/$/,
      ""
    );


  const url =
    new URL(
      `/seyahat/${bookingToken}/ekstralar`,
      baseUrl
    );


  url.searchParams.set(
    "order",
    orderToken
  );


  url.searchParams.set(
    "payment",
    result
  );


  if (message) {
    url.searchParams.set(
      "message",
      message
    );
  }


  return url;
}


export async function POST(
  request: Request
) {

  const orderId =
    new URL(
      request.url
    )
      .searchParams
      .get(
        "orderId"
      ) || "";


  try {

    const supabaseAdmin =
      getSupabaseAdmin();


    const token =
      await getToken(
        request
      );


    if (
      !orderId ||
      !token
    ) {
      return NextResponse.json(
        {
          error:
            "Ekstra ödeme callback bilgileri eksik.",
        },
        {
          status: 400,
        }
      );
    }


    const {
      data: order,
      error: orderError,
    } =
      await supabaseAdmin
        .from(
          "package_extra_orders"
        )
        .select(`
          id,
          booking_id,
          public_token,
          currency,
          sale_price,
          status,
          payment_provider,
          payment_reference,
          metadata
        `)
        .eq(
          "id",
          orderId
        )
        .maybeSingle();


    if (orderError) {
      throw orderError;
    }


    if (!order) {
      return NextResponse.json(
        {
          error:
            "Ekstra sipariş bulunamadı.",
        },
        {
          status: 404,
        }
      );
    }


    const {
      data: booking,
      error: bookingError,
    } =
      await supabaseAdmin
        .from(
          "package_bookings"
        )
        .select(`
          id,
          public_token,
          booking_code
        `)
        .eq(
          "id",
          order.booking_id
        )
        .maybeSingle();


    if (bookingError) {
      throw bookingError;
    }


    if (!booking) {
      return NextResponse.json(
        {
          error:
            "Paket rezervasyonu bulunamadı.",
        },
        {
          status: 404,
        }
      );
    }


    const metadata =
      (
        typeof order.metadata ===
          "object" &&
        order.metadata !== null
      )
        ? order.metadata as Record<
            string,
            unknown
          >
        : {};


    const expectedCheckoutToken =
      String(
        metadata.checkout_token ||
        ""
      );


    if (
      !expectedCheckoutToken ||
      token !==
        expectedCheckoutToken
    ) {
      return NextResponse.redirect(
        returnUrl(
          request,
          booking.public_token,
          order.public_token,
          "failed",
          "Ödeme doğrulama anahtarı uyuşmuyor."
        ),
        303
      );
    }


    const conversationId =
      String(
        metadata.payment_conversation_id ||
        ""
      );


    const result =
      await iyzicoPost<IyzicoRetrieveResponse>(
        {
          path:
            "/payment/iyzipos/checkoutform/auth/ecom/detail",

          body: {
            locale:
              "tr",

            conversationId,

            token,
          },
        }
      );


    const expectedAmount =
      Number(
        order.sale_price
      );


    const returnedAmount =
      Number(
        result.paidPrice ??
        result.price ??
        0
      );


    const amountMatches =
      Number.isFinite(
        returnedAmount
      ) &&
      Number.isFinite(
        expectedAmount
      ) &&
      Math.abs(
        returnedAmount -
        expectedAmount
      ) < 0.01;


    const currencyMatches =
      !result.currency ||
      result.currency ===
        order.currency;


    const succeeded =
      result.status ===
        "success" &&
      result.paymentStatus ===
        "SUCCESS" &&
      amountMatches &&
      currencyMatches;


    if (!succeeded) {

      const failure =
        result.errorMessage ||
        (
          !amountMatches
            ? "Ödeme tutarı beklenen ekstra sipariş tutarıyla uyuşmuyor."
            : !currencyMatches
              ? "Ödeme para birimi uyuşmuyor."
              : "Ekstra ödeme başarısız."
        );


      await supabaseAdmin
        .from(
          "package_extra_orders"
        )
        .update({
          metadata: {
            ...metadata,

            checkout_token:
              token,

            iyzico_payment_id:
              result.paymentId ||
              null,

            payment_status:
              result.paymentStatus ||
              null,

            fraud_status:
              result.fraudStatus ??
              null,

            error_code:
              result.errorCode ||
              null,

            error_message:
              failure,

            payment_failed_at:
              new Date()
                .toISOString(),
          },
        })
        .eq(
          "id",
          order.id
        );


      return NextResponse.redirect(
        returnUrl(
          request,
          booking.public_token,
          order.public_token,
          "failed",
          failure
        ),
        303
      );
    }


    const {
      data: finalize,
      error: finalizeError,
    } =
      await supabaseAdmin.rpc(
        "finalize_package_extra_iyzico_payment",
        {
          p_order_id:
            order.id,

          p_provider_reference:
            result.paymentId ||
            token,

          p_paid_amount:
            returnedAmount,

          p_metadata: {

            checkout_token:
              token,

            iyzico_payment_id:
              result.paymentId ||
              null,

            payment_status:
              result.paymentStatus,

            fraud_status:
              result.fraudStatus ??
              null,

            paid_price:
              returnedAmount,

            currency:
              result.currency ||
              order.currency,

            basket_id:
              result.basketId ||
              null,

            finalized_at:
              new Date()
                .toISOString(),
          },
        }
      );


    if (finalizeError) {
      throw finalizeError;
    }


    console.log(
      "Package extra payment finalized:",
      finalize
    );


    return NextResponse.redirect(
      returnUrl(
        request,
        booking.public_token,
        order.public_token,
        "success"
      ),
      303
    );


  } catch (error) {

    console.error(
      "Package extra iyzico callback:",
      error
    );


    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Ekstra ödeme sonucu doğrulanamadı.",
      },
      {
        status: 500,
      }
    );

  }
}
