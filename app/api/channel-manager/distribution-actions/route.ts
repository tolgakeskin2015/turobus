import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { resolveWaitingInboundMappings } from "@/lib/hotel/channel-manager/inbound/mapping-auto-ready";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const auth = request.headers.get("authorization");

    if (!auth?.startsWith("Bearer ")) {
      return NextResponse.json(
        { ok: false, error: "Oturum gerekli." },
        { status: 401 }
      );
    }

    const token = auth.slice(7);
    const body = await request.json();

    const companyId = String(body.companyId ?? "");
    const action = String(body.action ?? "");

    if (!companyId) {
      return NextResponse.json(
        { ok: false, error: "companyId eksik." },
        { status: 400 }
      );
    }

    const admin = getSupabaseAdmin();

    const {
      data: { user },
      error: userError,
    } = await admin.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json(
        { ok: false, error: "Oturum doğrulanamadı." },
        { status: 401 }
      );
    }

    const { data: membership, error: membershipError } =
      await admin
        .from("company_members")
        .select("id,role,is_active")
        .eq("user_id", user.id)
        .eq("company_id", companyId)
        .eq("is_active", true)
        .maybeSingle();

    if (membershipError) {
      throw new Error(membershipError.message);
    }

    if (!membership) {
      return NextResponse.json(
        { ok: false, error: "Firma yetkisi bulunamadı." },
        { status: 403 }
      );
    }

    if (
      !["super_admin", "company_owner", "operation_manager"].includes(
        membership.role
      )
    ) {
      return NextResponse.json(
        { ok: false, error: "Bu işlem için yetkiniz yok." },
        { status: 403 }
      );
    }

    if (action === "resolve_mappings") {
      const result = await resolveWaitingInboundMappings({
        companyId,
      });

      return NextResponse.json({
        ok: true,
        ...result,
      });
    }

    if (action === "retry_inbound") {
      const { data: rows, error } = await admin
        .from("hotel_channel_reservation_inbox")
        .select("id")
        .eq("company_id", companyId)
        .eq("processing_status", "failed")
        .limit(50);

      if (error) {
        throw new Error(error.message);
      }

      const ids = (rows ?? []).map((row) => row.id);

      if (ids.length > 0) {
        const { error: updateError } = await admin
          .from("hotel_channel_reservation_inbox")
          .update({
            processing_status: "ready",
            error_message: null,
            processed_at: null,
            updated_at: new Date().toISOString(),
          })
          .in("id", ids);

        if (updateError) {
          throw new Error(updateError.message);
        }
      }

      return NextResponse.json({
        ok: true,
        reset: ids.length,
      });
    }

    if (action === "full_sync") {
      const { data: connections, error: connectionError } = await admin
        .from("hotel_channel_connections")
        .select("id,hotel_id,channel_code")
        .eq("company_id", companyId)
        .eq("status", "active");

      if (connectionError) {
        throw new Error(connectionError.message);
      }

      const now = new Date().toISOString();

      const rows = (connections ?? []).map((connection) => ({
        company_id: companyId,
        hotel_id: connection.hotel_id,
        connection_id: connection.id,
        operation_type: "full_sync",
        payload: {
          channel_code: connection.channel_code,
          requested_from: "distribution_center",
          requested_at: now,
        },
        priority: 10,
        status: "pending",
        attempt_count: 0,
        available_at: now,
        created_at: now,
        updated_at: now,
      }));

      if (rows.length > 0) {
        const { error: insertError } = await admin
          .from("hotel_channel_sync_queue")
          .insert(rows);

        if (insertError) {
          throw new Error(insertError.message);
        }
      }

      return NextResponse.json({
        ok: true,
        queued: rows.length,
      });
    }



    if (
      action === "pause_connection" ||
      action === "activate_connection"
    ) {
      const connectionId = String(body.connectionId ?? "");

      if (!connectionId) {
        return NextResponse.json(
          { ok: false, error: "connectionId eksik." },
          { status: 400 }
        );
      }

      const status =
        action === "pause_connection"
          ? "paused"
          : "active";

      const { error } = await admin
        .from("hotel_channel_connections")
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", connectionId)
        .eq("company_id", companyId);

      if (error) {
        throw new Error(error.message);
      }

      return NextResponse.json({
        ok: true,
        status,
      });
    }

    if (action === "connection_test") {
      const connectionId = String(body.connectionId ?? "");

      if (!connectionId) {
        return NextResponse.json(
          { ok: false, error: "connectionId eksik." },
          { status: 400 }
        );
      }

      const { data: connection, error: connectionError } = await admin
        .from("hotel_channel_connections")
        .select("id,hotel_id,channel_code")
        .eq("id", connectionId)
        .eq("company_id", companyId)
        .maybeSingle();

      if (connectionError) {
        throw new Error(connectionError.message);
      }

      if (!connection) {
        return NextResponse.json(
          { ok: false, error: "Kanal bağlantısı bulunamadı." },
          { status: 404 }
        );
      }

      const now = new Date().toISOString();

      const { error: queueError } = await admin
        .from("hotel_channel_sync_queue")
        .insert({
          company_id: companyId,
          hotel_id: connection.hotel_id,
          connection_id: connection.id,
          operation_type: "connection_test",
          payload: {
            channel_code: connection.channel_code,
            requested_from: "distribution_center",
            requested_at: now,
          },
          priority: 1,
          status: "pending",
          attempt_count: 0,
          available_at: now,
          created_at: now,
          updated_at: now,
        });

      if (queueError) {
        throw new Error(queueError.message);
      }

      return NextResponse.json({
        ok: true,
        queued: 1,
      });
    }

    return NextResponse.json(
      { ok: false, error: "Geçersiz işlem." },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "İşlem başarısız.",
      },
      { status: 500 }
    );
  }
}
