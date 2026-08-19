import {
  NextResponse,
} from "next/server";

import {
  createClient,
} from "@supabase/supabase-js";


export const runtime =
  "nodejs";


type Body = {
  companyId?: string;

  action?:
    | "create_task"
    | "schedule_lead_followup"
    | "resolve_crm_alert";

  confirm?: boolean;

  payload?: Record<
    string,
    unknown
  >;
};


export async function POST(
  request:
    Request
) {
  try {
    const authHeader =
      request.headers.get(
        "authorization"
      ) ?? "";


    if (
      !authHeader.startsWith(
        "Bearer "
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Oturum doğrulanamadı.",
        },
        {
          status:
            401,
        }
      );
    }


    const token =
      authHeader.slice(
        7
      );


    const body =
      await request.json() as
        Body;


    if (
      body.confirm !==
      true
    ) {
      return NextResponse.json(
        {
          error:
            "Kullanıcı onayı gerekiyor.",
        },
        {
          status:
            409,
        }
      );
    }


    const companyId =
      String(
        body.companyId ??
          ""
      ).trim();


    if (!companyId) {
      return NextResponse.json(
        {
          error:
            "Firma bilgisi eksik.",
        },
        {
          status:
            400,
        }
      );
    }


    const url =
      process.env
        .NEXT_PUBLIC_SUPABASE_URL;


    const anon =
      process.env
        .NEXT_PUBLIC_SUPABASE_ANON_KEY;


    if (
      !url ||
      !anon
    ) {
      return NextResponse.json(
        {
          error:
            "Supabase yapılandırması eksik.",
        },
        {
          status:
            500,
        }
      );
    }


    const supabase =
      createClient(
        url,
        anon,
        {
          global: {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          },

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
        userData,

      error:
        userError,
    } =
      await supabase.auth.getUser(
        token
      );


    if (
      userError ||
      !userData.user
    ) {
      return NextResponse.json(
        {
          error:
            "Geçersiz oturum.",
        },
        {
          status:
            401,
        }
      );
    }


    const {
      data:
        membership,

      error:
        membershipError,
    } =
      await supabase
        .from(
          "company_members"
        )
        .select(
          "company_id,role,is_active"
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
      membershipError ||
      !membership
    ) {
      return NextResponse.json(
        {
          error:
            "Firma erişimi yok.",
        },
        {
          status:
            403,
        }
      );
    }


    const payload =
      body.payload ??
      {};


    if (
      body.action ===
      "create_task"
    ) {
      const {
        data,
        error,
      } =
        await supabase.rpc(
          "yacht_os_copilot_create_task",
          {
            p_company_id:
              companyId,

            p_title:
              String(
                payload.title ??
                  ""
              ),

            p_description:
              payload.description
                ? String(
                    payload.description
                  )
                : null,

            p_due_at:
              payload.dueAt
                ? String(
                    payload.dueAt
                  )
                : null,

            p_priority:
              String(
                payload.priority ??
                  "medium"
              ),

            p_booking_id:
              payload.bookingId
                ? String(
                    payload.bookingId
                  )
                : null,

            p_yacht_id:
              payload.yachtId
                ? String(
                    payload.yachtId
                  )
                : null,

            p_lead_id:
              payload.leadId
                ? String(
                    payload.leadId
                  )
                : null,
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
      });
    }


    if (
      body.action ===
      "schedule_lead_followup"
    ) {
      const {
        data,
        error,
      } =
        await supabase.rpc(
          "yacht_os_copilot_schedule_lead_followup",
          {
            p_lead_id:
              String(
                payload.leadId ??
                  ""
              ),

            p_due_at:
              String(
                payload.dueAt ??
                  ""
              ),

            p_note:
              payload.note
                ? String(
                    payload.note
                  )
                : null,
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
      });
    }


    if (
      body.action ===
      "resolve_crm_alert"
    ) {
      const status =
        String(
          payload.status ??
            "resolved"
        );


      if (
        ![
          "resolved",
          "dismissed",
        ].includes(
          status
        )
      ) {
        return NextResponse.json(
          {
            error:
              "Geçersiz alarm kararı.",
          },
          {
            status:
              400,
          }
        );
      }


      const {
        data,
        error,
      } =
        await supabase.rpc(
          "yacht_os_copilot_resolve_crm_alert",
          {
            p_event_id:
              String(
                payload.eventId ??
                  ""
              ),

            p_status:
              status,
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
      });
    }


    return NextResponse.json(
      {
        error:
          "Bilinmeyen Copilot aksiyonu.",
      },
      {
        status:
          400,
      }
    );

  } catch (
    currentError
  ) {
    console.error(
      "Copilot action error:",
      currentError
    );


    return NextResponse.json(
      {
        error:
          currentError instanceof
            Error
            ? currentError.message
            : "İşlem başarısız.",
      },
      {
        status:
          500,
      }
    );
  }
}
