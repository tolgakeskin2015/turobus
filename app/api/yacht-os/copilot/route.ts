import {
  NextResponse,
} from "next/server";

import OpenAI from "openai";

import {
  createClient,
} from "@supabase/supabase-js";


export const runtime =
  "nodejs";


type CopilotBody = {
  companyId?: string;
  question?: string;
};


function compact<T>(
  rows:
    T[] | null,
  limit =
    100
) {
  return (
    rows ?? []
  ).slice(
    0,
    limit
  );
}


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


    const accessToken =
      authHeader.slice(
        7
      );


    const body =
      await request.json() as
        CopilotBody;


    const companyId =
      String(
        body.companyId ??
          ""
      ).trim();


    const question =
      String(
        body.question ??
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


    if (
      question.length <
      3
    ) {
      return NextResponse.json(
        {
          error:
            "Copilot sorusu çok kısa.",
        },
        {
          status:
            400,
        }
      );
    }


    if (
      question.length >
      2000
    ) {
      return NextResponse.json(
        {
          error:
            "Copilot sorusu çok uzun.",
        },
        {
          status:
            400,
        }
      );
    }


    const supabaseUrl =
      process.env
        .NEXT_PUBLIC_SUPABASE_URL;


    const supabaseAnonKey =
      process.env
        .NEXT_PUBLIC_SUPABASE_ANON_KEY;


    if (
      !supabaseUrl ||
      !supabaseAnonKey
    ) {
      return NextResponse.json(
        {
          error:
            "Supabase server yapılandırması eksik.",
        },
        {
          status:
            500,
        }
      );
    }


    const supabase =
      createClient(
        supabaseUrl,
        supabaseAnonKey,
        {
          global: {
            headers: {
              Authorization:
                `Bearer ${accessToken}`,
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
        userResult,

      error:
        userError,
    } =
      await supabase.auth.getUser(
        accessToken
      );


    if (
      userError ||
      !userResult.user
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
          userResult.user.id
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
            "Bu firma için Copilot erişiminiz yok.",
        },
        {
          status:
            403,
        }
      );
    }


    const [
      bookings,
      leads,
      events,
      tasks,
      yachts,
      recommendations,
    ] =
      await Promise.all([

        supabase
          .from(
            "yacht_os_bookings"
          )
          .select(
            "id,booking_code,yacht_id,start_date,end_date,status,payment_status,total_amount,paid_amount,supplier_cost,commission_amount,currency,collection_due_at,collection_priority,operation_status,check_in_status"
          )
          .eq(
            "company_id",
            companyId
          )
          .order(
            "start_date",
            {
              ascending:
                true,
            }
          )
          .limit(
            150
          ),


        supabase
          .from(
            "yacht_os_leads"
          )
          .select(
            "id,customer_name,source,stage,priority,score,budget_max,currency,next_follow_up_at,last_contact_at,created_at"
          )
          .eq(
            "company_id",
            companyId
          )
          .order(
            "created_at",
            {
              ascending:
                false,
            }
          )
          .limit(
            150
          ),


        supabase
          .from(
            "yacht_os_crm_automation_events"
          )
          .select(
            "id,lead_id,rule_code,severity,title,message,status,due_at,detected_at"
          )
          .eq(
            "company_id",
            companyId
          )
          .eq(
            "status",
            "open"
          )
          .order(
            "detected_at",
            {
              ascending:
                false,
            }
          )
          .limit(
            150
          ),


        supabase
          .from(
            "yacht_os_tasks"
          )
          .select(
            "id,yacht_id,booking_id,lead_id,title,due_at,priority,status,assigned_to_name"
          )
          .eq(
            "company_id",
            companyId
          )
          .not(
            "status",
            "in",
            "(completed,cancelled)"
          )
          .order(
            "due_at",
            {
              ascending:
                true,

              nullsFirst:
                false,
            }
          )
          .limit(
            150
          ),


        supabase
          .from(
            "yacht_os_yachts"
          )
          .select(
            "id,name,yacht_type,city,marina,status,base_daily_price,currency,minimum_days"
          )
          .eq(
            "company_id",
            companyId
          )
          .order(
            "name"
          ),


        supabase
          .from(
            "yacht_os_rate_recommendations"
          )
          .select(
            "id,yacht_id,period_start,period_end,occupancy_percent,bookings_last_7_days,current_average_price,suggested_weekday_price,suggested_weekend_price,adjustment_percent,confidence_score,reason_codes,reason_summary,currency,status"
          )
          .eq(
            "company_id",
            companyId
          )
          .eq(
            "status",
            "pending"
          )
          .order(
            "created_at",
            {
              ascending:
                false,
            }
          )
          .limit(
            100
          ),
      ]);


    const queryError =
      bookings.error ??
      leads.error ??
      events.error ??
      tasks.error ??
      yachts.error ??
      recommendations.error;


    if (queryError) {
      console.error(
        "Yacht Copilot data error:",
        queryError
      );

      return NextResponse.json(
        {
          error:
            "Copilot yönetim verisini hazırlayamadı.",
        },
        {
          status:
            500,
        }
      );
    }


    const snapshot = {
      generated_at:
        new Date()
          .toISOString(),

      user_role:
        membership.role,

      fleet:
        compact(
          yachts.data,
          100
        ),

      bookings:
        compact(
          bookings.data,
          150
        ),

      leads:
        compact(
          leads.data,
          150
        ),

      crm_alerts:
        compact(
          events.data,
          150
        ),

      open_tasks:
        compact(
          tasks.data,
          150
        ),

      pending_rate_recommendations:
        compact(
          recommendations.data,
          100
        ),
    };


    if (
      !process.env
        .OPENAI_API_KEY
    ) {
      return NextResponse.json(
        {
          error:
            "OPENAI_API_KEY henüz yapılandırılmamış. Copilot kodu hazır fakat gerçek AI çağrısı için sunucu anahtarı gerekiyor.",
        },
        {
          status:
            503,
        }
      );
    }


    const openai =
      new OpenAI({
        apiKey:
          process.env
            .OPENAI_API_KEY,
      });


    const response =
      await openai.responses.create({
        model:
          process.env
            .OPENAI_YACHT_COPILOT_MODEL ||
          "gpt-5.6",

        store:
          false,

        max_output_tokens:
          1200,

        instructions:
          [
            "Sen Turobus Yacht OS yönetici karar destek Copilot'ısın.",
            "Yalnız sana verilen şirket snapshot verisini kullan.",
            "Veride olmayan rakam, müşteri, olay veya sebep uydurma.",
            "Yanıt dili Türkçe olsun.",
            "Finansal rakamları ve tarihleri mümkün olduğunca açık belirt.",
            "Önce en kritik konuyu söyle, sonra önem sırasına göre devam et.",
            "Yalnız öneri üret. Hiçbir işlemi yapılmış gibi anlatma.",
            "Kullanıcı fiyat, rezervasyon, tahsilat, lead veya operasyon değişikliği isterse öneriyi açıkla fakat işlemin uygulanmadığını belirt.",
            "Risk ile fırsatı ayır.",
            "Gereksiz uzun cevap verme.",
            "Mümkün olduğunda ilgili Yacht OS merkezini öner: Finans Control Tower, CRM Center, CRM Automation, Revenue Intelligence, Operation Center veya Fleet Maintenance.",
          ].join(
            "\n"
          ),

        input:
          [
            "YÖNETİCİ SORUSU:",
            question,
            "",
            "TUROBUS YACHT OS ŞİRKET SNAPSHOT:",
            JSON.stringify(
              snapshot
            ),
          ].join(
            "\n"
          ),
      });


    const answer =
      response.output_text
        ?.trim();


    if (!answer) {
      return NextResponse.json(
        {
          error:
            "Copilot boş yanıt üretti.",
        },
        {
          status:
            502,
        }
      );
    }


    return NextResponse.json({
      answer,

      model:
        process.env
          .OPENAI_YACHT_COPILOT_MODEL ||
        "gpt-5.6",

      generatedAt:
        new Date()
          .toISOString(),

      readOnly:
        true,
    });

  } catch (
    currentError
  ) {
    console.error(
      "Yacht Copilot error:",
      currentError
    );


    return NextResponse.json(
      {
        error:
          currentError instanceof
            Error
            ? currentError.message
            : "Copilot beklenmeyen hata verdi.",
      },
      {
        status:
          500,
      }
    );
  }
}
